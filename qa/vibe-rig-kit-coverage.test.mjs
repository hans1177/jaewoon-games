import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {classify,classifyAll,norm} from '../tools/vibe-rig-kit.mjs';

const ids=names=>{const r=classifyAll(names);return {primary:r.primary.id,overlays:r.overlays.map(o=>o.id)}};

test('기존 이름 규칙은 그대로이고 Luau 가족 표와 같다', () => {
  const r=spawnSync('node',['tools/vibe-rig-kit.mjs','--check'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  for(const n of ['UpperArm.L','FrontUpperLeg.L','Wing1.R','Body','Leg1L','TailFin'])
    assert.equal(norm(n),n.toLowerCase().replace(/[._\s]/g,''),n);
  assert.equal(classify(['UpperArm.L','UpperArm.R','UpperLeg.L','UpperLeg.R']).id,'biped');
  assert.equal(classify(['FrontUpperLeg.L','BackUpperLeg.L','Body']).id,'quadruped');
  assert.equal(classify(['Head','Tail','Chest','Body']).id,'snake');
  assert.equal(classify(['Wing1.L','Wing1.R','Torso']).id,'winged');
  assert.equal(classify(['Body1','Body2']).id,'chain');
  assert.equal(classify(['Body','Head']).id,'simple');
  assert.equal(classify(['Nothing']).id,'static');
});

test('Unity·Mixamo·Blender 휴머노이드 이름이 모두 같은 이족 리그로 인식된다', () => {
  assert.equal(norm('LeftUpperArm'),'upperarml');
  assert.equal(norm('RightUpperLeg'),'upperlegr');
  assert.equal(norm('mixamorig:LeftArm'),'upperarml');
  assert.equal(norm('mixamorig:LeftUpLeg'),'upperlegl');
  assert.equal(norm('mixamorig:LeftLeg'),'lowerlegl');
  assert.equal(norm('mixamorig:RightForeArm'),'lowerarmr');
  const unity=['Hips','Spine','Head','LeftUpperArm','RightUpperArm','LeftUpperLeg','RightUpperLeg'];
  const mixamo=['mixamorig:Hips','mixamorig:LeftArm','mixamorig:RightArm','mixamorig:LeftUpLeg','mixamorig:RightUpLeg'];
  const blender=['Hips','UpperArm.L','UpperArm.R','UpperLeg.L','UpperLeg.R'];
  for(const rig of [unity,mixamo,blender])assert.equal(classify(rig).id,'biped',rig.join(','));
});

test('Left/Right 단독 이름은 그대로 두고 가족으로 오인하지 않는다', () => {
  assert.equal(norm('Left'),'left');
  assert.equal(norm('Right'),'right');
  assert.equal(classify(['Left','Right']).id,'static');
});

test('다리 4개 + 날개 같은 겹친 리그를 주 가족과 overlay로 함께 인식한다', () => {
  const dragon=['Body','Head','FrontUpperLegL','FrontUpperLegR','BackUpperLegL','BackUpperLegR','Wing1L','Wing1R','Tail'];
  assert.deepEqual(ids(dragon),{primary:'quadruped',overlays:['winged']});
  assert.equal(classify(dragon).id,'quadruped'); // classify는 기존과 같은 주 가족만 돌려준다
  const batman=['Body','Head','UpperArmL','UpperArmR','UpperLegL','UpperLegR','Wing1L','Wing1R'];
  assert.deepEqual(ids(batman),{primary:'biped',overlays:['winged']});
  assert.deepEqual(ids(['Body','Head','WingL','WingR']),{primary:'winged',overlays:[]});
  assert.deepEqual(ids(['UpperArmL','UpperArmR','UpperLegL','UpperLegR']),{primary:'biped',overlays:[]});
});

test('거미·문어·물고기가 엉뚱한 simple/static 대신 자기 가족으로 분류되고 일감으로 표시된다', () => {
  const spider=['Body','Head','Leg1L','Leg2L','Leg3L','Leg4L','Leg1R','Leg2R','Leg3R','Leg4R'];
  const octopus=['Body','Head','Tentacle1','Tentacle2','Tentacle3','Tentacle4'];
  const fish=['Spine1','Spine2','Spine3','TailFin','DorsalFin','PectoralFinL','PectoralFinR'];
  assert.equal(classify(spider).id,'multileg');
  assert.equal(classify(octopus).id,'tentacle');
  assert.equal(classify(fish).id,'swimmer');
  for(const rig of [spider,octopus,fish])assert.equal(classify(rig).needsAnimator,true);
  // 기존에 처리되던 가족은 일감으로 바뀌지 않는다
  for(const rig of [['UpperArmL','UpperArmR','UpperLegL','UpperLegR'],['Head','Tail','Chest','Body'],['WingL','WingR']])
    assert.ok(!classify(rig).needsAnimator);
});

test('다리 이름이 적은 리그는 multileg로 잘못 분류되지 않는다', () => {
  assert.equal(classify(['Body','Head','Leg1L','Leg1R','Leg2L','Leg2R']).id,'simple'); // 4개: minAny(6) 미만
  assert.equal(classify(['Body','Head','LegL','LegR','WingL','WingR']).id,'winged');
  assert.equal(classify(['Body','Head','TailFin']).id,'simple'); // 지느러미 1개만으론 swimmer 아님
});

test('Luau 모듈이 같은 정규화 규칙과 ClassifyAll을 갖는다', () => {
  const luau=fs.readFileSync('assets/roblox/common-rig-kit-v1/RobloxCommonRigKit.luau','utf8');
  assert.match(luau,/function Kit\.ClassifyAll\(bones\)/);
  assert.match(luau,/"mixamorig"/);
  assert.match(luau,/\{ "left", "l" \}, \{ "right", "r" \}/);
  assert.match(luau,/\[%\._%s:%-\]/);
  assert.match(luau,/hits >= family\.minAny/);
  const table=JSON.parse(fs.readFileSync('assets/roblox/common-rig-kit-v1/rig-families.json','utf8'));
  for(const [k,v] of Object.entries(table.renames))assert.ok(luau.includes(`["${k}"] = "${v}"`),k);
  for(const f of table.families)assert.ok(luau.includes(`id = "${f.id}"`),f.id);
});

test('한 글자 접두(L_UpperArm)는 알려진 뼈 이름 앞에서만 읽고 정상 이름은 건드리지 않는다', () => {
  assert.equal(norm('L_UpperArm'),'upperarml');
  assert.equal(norm('R_Thigh'),'upperlegr');
  assert.equal(norm('L_Shin'),'lowerlegl');
  assert.equal(norm('R_Forearm'),'lowerarmr');
  assert.equal(norm('mixamorig:LeftCalf'),'lowerlegl');
  // 이미 표준인 이름·l/r로 시작하는 다른 이름은 그대로
  for(const n of ['LowerArm.L','LowerLeg.R','Leg1L','LegL','Lower','Root','L_Thumb1','Right'])
    assert.equal(norm(n),n.toLowerCase().replace(/[._\s:-]/g,''),n);
});

test('저장소의 캐릭터 공장이 만드는 뼈 이름은 이족 리그로 인식된다', () => {
  // 공장 스크립트(tools/vibe_genre_character_factory.py)에서 뼈 이름을 읽어 와서, 공장 뼈가 바뀌어도 이 검사가 따라간다.
  const src=fs.readFileSync('tools/vibe_genre_character_factory.py','utf8');
  const names=new Set();
  for(const m of src.matchAll(/bone\('(\w+)'/g))names.add(m[1]);
  for(const m of src.matchAll(/bone\(side\+'_(\w+)'/g))for(const side of ['L','R'])names.add(`${side}_${m[1]}`);
  for(const must of ['Root','Hips','Spine','Head','L_UpperArm','R_Thigh','L_Shin','R_Foot'])assert.ok(names.has(must),`공장 스크립트에서 ${must} 뼈를 찾지 못함`);
  assert.equal(classify([...names]).id,'biped');
});
