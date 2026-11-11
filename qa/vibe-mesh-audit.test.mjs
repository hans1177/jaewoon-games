import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import {evaluateAudit,evaluateMotionCurves,measure,blenderAvailable} from '../tools/vibe-mesh-audit.mjs';

const good=()=>({armatures:[{name:'Rig',bones:20,roots:1}],height:2,groundOffsetRatio:0.002,triangles:9000,actions:[{name:'Idle'}],
  symmetry:[{pair:['L_Arm','R_Arm'],sizeErr:0.01,posErr:0.01,zErr:0.01}],
  meshes:[{name:'Body',orphan:false,unweightedVertices:0,maxInfluences:3,unnormalizedVertices:0,nearestGapRatio:0,primitiveLike:false}]});

test('정상 측정값은 통과하고 제품 후보가 된다', () => {
  const v=evaluateAudit(good());
  assert.deepEqual(v.failures,[]);assert.equal(v.pass,true);assert.equal(v.productionEligible,true);
});

test('뼈에 안 묶인 메쉬·가중치 누락·영향 뼈 5개 이상·정규화 안 된 가중치를 각각 잡는다', () => {
  const a=good();a.meshes.push({name:'Cape',orphan:true,unweightedVertices:12,maxInfluences:6,unnormalizedVertices:3,nearestGapRatio:0,primitiveLike:false});
  const f=evaluateAudit(a).failures.join(' ');
  for(const k of ['ORPHAN_MESH:Cape','UNWEIGHTED_VERTICES:Cape:12','TOO_MANY_INFLUENCES:Cape:6','UNNORMALIZED_WEIGHTS:Cape:3'])assert.ok(f.includes(k),k);
});

test('떠 있는 부품·바닥 뜸·비대칭·뼈 루트 2개·삼각형 초과를 잡고, 손에 든 물건은 봐준다', () => {
  const a=good();
  a.meshes.push({name:'L_Arm',orphan:false,unweightedVertices:0,maxInfluences:2,unnormalizedVertices:0,nearestGapRatio:0.08,primitiveLike:false});
  a.meshes.push({name:'Handheld_staff',orphan:false,unweightedVertices:0,maxInfluences:0,unnormalizedVertices:0,nearestGapRatio:0.5,primitiveLike:false});
  a.groundOffsetRatio=0.2;a.armatures[0].roots=2;a.triangles=200000;
  a.symmetry[0].sizeErr=0.3;
  const f=evaluateAudit(a).failures.join(' ');
  for(const k of ['FLOATING_PART:L_Arm','GROUND_OFFSET','ARMATURE_ROOTS','TRIANGLE_BUDGET','ASYMMETRIC:L_Arm/R_Arm'])assert.ok(f.includes(k),k);
  assert.ok(!f.includes('Handheld_staff'));
});

test('기본 도형으로 만든 메쉬가 많으면 고장은 아니지만 제품 에셋으로는 막는다(오너 규칙)', () => {
  const a=good();a.meshes=Array.from({length:10},(_,i)=>({name:'P'+i,orphan:false,unweightedVertices:0,maxInfluences:1,unnormalizedVertices:0,nearestGapRatio:0,primitiveLike:i<5}));
  const v=evaluateAudit(a);
  assert.equal(v.pass,true);assert.equal(v.productionEligible,false);
  assert.ok(v.productionBlockers[0].startsWith('PRIMITIVE_BUILT_MESH:5/10'));
});

test('리그 미연결 메쉬가 최저점을 끌어내리면 원인만 표시하고 품질 불합격은 유지한다', () => {
  const a=good();
  a.groundOffsetRatio=-0.2691;
  a.groundEvidence={lowestMesh:'Icosphere',lowestMeshMinZ:-0.7,
    lowestBoundMesh:'Boot',lowestBoundMeshMinZ:0.01,boundGroundOffsetRatio:0.004,
    orphanMeshesBelowBoundGround:['Icosphere']};
  a.meshes.push({name:'Icosphere',orphan:true,minZ:-0.7,nearestMesh:'Boot',
    unweightedVertices:null,maxInfluences:0,unnormalizedVertices:0,nearestGapRatio:0.06,primitiveLike:false});
  const result=evaluateAudit(a);
  assert.equal(result.pass,false);
  assert.equal(result.productionEligible,false);
  assert.ok(result.failures.includes('ORPHAN_MESH:Icosphere'));
  assert.ok(result.failures.includes('GROUND_OFFSET:-0.2691'));
  assert.equal(result.diagnostics.lowestMesh,'Icosphere');
  assert.equal(result.diagnostics.lowestBoundMesh,'Boot');
  assert.equal(result.diagnostics.boundGroundOffsetRatio,0.004);
  assert.deepEqual(result.diagnostics.orphanMeshesBelowBoundGround,['Icosphere']);
  assert.deepEqual(result.diagnostics.detachedMeshes.map(m=>m.name),['Icosphere']);
  assert.equal(result.diagnostics.separatedMeshes[0].nearestMesh,'Boot');
});

test('수리 후보 출력이 원본 또는 측정 JSON을 덮어쓰는 경로면 거부한다', () => {
  const original=path.resolve('tools/vibe_mesh_audit.py');
  assert.throws(()=>measure(original,{candidateOutput:original}),/INVALID_RIG_CANDIDATE_PATH/);
  const output=path.join(os.tmpdir(),'rig-candidate-audit.json');
  assert.throws(()=>measure(original,{out:output,candidateOutput:output}),/INVALID_RIG_CANDIDATE_PATH/);
});

test('빈 입력은 메쉬·리그 없음으로 실패한다', () => {
  const f=evaluateAudit({meshes:[],armatures:[]}).failures;
  assert.ok(f.includes('NO_MESH')&&f.includes('NO_ARMATURE'));
});

test('모션 실측은 실제 본의 움직이는 키프레임 곡선만 인정하고 이름만 있는 클립은 제외한다',()=>{
  const valid=name=>({name,frames:[0,30],curvesInspected:true,curveCount:4,
    keyframeCount:22,boneCurves:4,validBoneCurves:4,movingBoneCurves:3,invalidCurves:0});
  const result=evaluateMotionCurves([valid('Walk'),valid('Attack'),{
    ...valid('Idle'),movingBoneCurves:0
  },{name:'Fake_Attack',frames:[0,30],curvesInspected:false},
  {...valid('Broken_Run'),invalidCurves:1},{...valid('Outside'),frames:[0,0]}]);
  assert.equal(result.observedClips,6);
  assert.equal(result.inspectedClips,5);
  assert.equal(result.validMovingClips,2);
  assert.deepEqual(result.validClipNames,['Walk','Attack']);
  assert.equal(result.invalidOrUnmeasuredClips,4);
  assert.equal(result.curveMeasurementAvailable,true);
  assert.equal(result.gameplayMotionVerified,false);
  assert.equal(result.nativeRuntimeVerified,false);
  assert.equal(result.gameApplied,false);
  assert.equal(evaluateMotionCurves([{name:'Attack',frames:[0,20]}]).validMovingClips,0);
  assert.equal(evaluateMotionCurves([]).curveMeasurementAvailable,false);
});

// 실제 Blender(또는 bpy)가 있을 때만: 캐릭터 공장 → 감사까지 끝에서 끝으로 돌린다.
test('실제 Blender: 캐릭터 공장 결과가 리그 검사를 통과하고 도형 인형임이 드러난다', {skip:!blenderAvailable()&&'Blender/bpy 없음',timeout:600000}, () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-hero-'));
  const env=process.env.VIBE2_BLENDER_BINARY;
  const script=path.resolve('tools/vibe_genre_character_factory.py');
  const r=env
    ?spawnSync(env,['--background','--factory-startup','--python-exit-code','1','--python',script,'--','--output-dir',dir,'--genre','fantasy'],{encoding:'utf8',maxBuffer:1<<26})
    :spawnSync('python3',['-c',`import sys,runpy;sys.argv=['x','--','--output-dir',${JSON.stringify(dir)},'--genre','fantasy'];runpy.run_path(${JSON.stringify(script)},run_name='__main__')`],{encoding:'utf8',maxBuffer:1<<26});
  assert.equal(r.status,0,String(r.stderr).slice(-400));
  const raw=measure(path.join(dir,'fantasy.blend'));
  const v=evaluateAudit(raw);
  assert.ok(raw.groundEvidence&&typeof raw.groundEvidence.lowestMesh==='string');
  assert.ok(Number.isFinite(raw.groundEvidence.boundGroundOffsetRatio));
  assert.deepEqual(v.failures,[]);
  assert.ok(v.stats.bones>=40&&v.stats.actions>=6);
  assert.equal(v.productionEligible,false); // 구·큐브로 만든 인형은 제품 에셋 후보가 아니다
});

 
// [실제 CC0 검증] Blender 재수출 없이 독립 노드만 제거하여 원본 모션 바이트를 보존한다.
// Blender 없는 기본 QA에서는 건너뛰고, Blender 설치 후 기존 연습 워크플로에서 반드시 실행한다.
test('실제 Blender: 스켈레톤 원본 독립 노드 제거 후 리그·모션 보존을 재검사한다',
  {skip:!blenderAvailable()&&'Blender/bpy 없음',timeout:180000}, () => {
  const source=path.resolve('assets/roblox/actors/native/skeleton-minion.glb');
  assert.ok(fs.existsSync(source),'승인 CC0 모델 원본이 누락됨');
  const checksum=()=>crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  const sourceSha=checksum();
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-rig-repair-'));
  const candidate=path.join(dir,'candidate.glb');
  try{
    const original=measure(source,{out:path.join(dir,'source.json'),candidateOutput:candidate});
    if(!original.candidate?.created){
      // [실측 원인] glTF 원본 노드명과 Blender의 실제 오브젝트명이 다른지 구분한다.
      const bytes=fs.readFileSync(source);
      const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
      const sourceNodes=(gltf.nodes||[]).map((node,i)=>({
        i,name:node.name||null,meshName:Number.isInteger(node.mesh)?gltf.meshes?.[node.mesh]?.name||null:null,
        mesh:node.mesh??null,parent: (gltf.nodes||[]).findIndex(n=>(n.children||[]).includes(i))
      }));
      console.log('RIG_GLB_SOURCE_NODES='+JSON.stringify({
        count:sourceNodes.length,meshCount:gltf.meshes?.length,
        extensions:gltf.extensionsUsed||[],scenes:gltf.scenes?.map(x=>x.nodes?.length),
        named:sourceNodes.filter(n=>/ico|sphere|skeleton|minion|root/i.test(n.name||'')||/ico|sphere/i.test(n.meshName||'')).slice(0,30),
        meshObjects:original.meshes.map(m=>({name:m.name,vertices:m.vertices,faces:m.faces,orphan:m.orphan})),
        error:original.candidate.reason
      }));
    }
    assert.equal(original.candidate?.created,true,JSON.stringify(original.candidate));
    assert.ok(fs.existsSync(candidate));
    assert.ok(original.meshes.some(m=>m.name==='Icosphere'&&m.orphan));
    const fixed=measure(candidate,{out:path.join(dir,'candidate.json')});
    const verdict=evaluateAudit(fixed);
    const originalCurves=evaluateMotionCurves(original.actions);
    const fixedCurves=evaluateMotionCurves(fixed.actions);
    assert.ok(!fixed.meshes.some(m=>m.name==='Icosphere'));
    assert.equal(verdict.pass,true,JSON.stringify(verdict.failures));
    assert.equal(fixed.armatures.reduce((n,a)=>n+a.bones,0),
      original.armatures.reduce((n,a)=>n+a.bones,0));
    assert.equal(fixedCurves.validMovingClips,originalCurves.validMovingClips);
    assert.equal(fixedCurves.movingBoneCurves,originalCurves.movingBoneCurves);
    assert.ok(fixedCurves.validMovingClips>0);
    // GLB 원본의 BIN 파트가 비트 단위로 동일해야 모션 키프레임·스킨 버퍼가 보존된다.
    const binaryChunk=filename=>{
      const bytes=fs.readFileSync(filename);
      const offset=20+bytes.readUInt32LE(12);
      assert.equal(bytes.toString('ascii',offset+4,offset+7),'BIN');
      return bytes.subarray(offset+8,offset+8+bytes.readUInt32LE(offset));
    };
    assert.deepEqual(binaryChunk(candidate),binaryChunk(source));
    assert.equal(checksum(),sourceSha,'원본 모델 SHA가 변경됨');
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
