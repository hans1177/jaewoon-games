import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {evaluateAudit,measure,blenderAvailable} from '../tools/vibe-mesh-audit.mjs';

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

test('빈 입력은 메쉬·리그 없음으로 실패한다', () => {
  const f=evaluateAudit({meshes:[],armatures:[]}).failures;
  assert.ok(f.includes('NO_MESH')&&f.includes('NO_ARMATURE'));
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
  const v=evaluateAudit(measure(path.join(dir,'fantasy.blend')));
  assert.deepEqual(v.failures,[]);
  assert.ok(v.stats.bones>=40&&v.stats.actions>=6);
  assert.equal(v.productionEligible,false); // 구·큐브로 만든 인형은 제품 에셋 후보가 아니다
});
