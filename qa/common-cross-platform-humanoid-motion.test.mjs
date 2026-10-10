// 기존 공용 자산 작업자의 실제 3D 원본과 단일 모션 제작 원본을 검증한다.
// Unity Web/Roblox runtime PASS는 각 플랫폼 독립 QA 후에만 인정한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'assets','shared','humanoid-motion-v1');
const catalog=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8'));
const producer=fs.readFileSync(path.join(dir,'author-motion.py'),'utf8');
const source=fs.readFileSync(path.join(dir,'base-skinned-humanoid.glb'));

function glbJson(bytes){
  assert.equal(bytes.subarray(0,4).toString('ascii'),'glTF');
  assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  let position=12;
  while(position+8<=bytes.length){
    const size=bytes.readUInt32LE(position);
    const type=bytes.readUInt32LE(position+4);
    position+=8;
    assert.ok(position+size<=bytes.length,'GLB chunk must be bounded by file size');
    if(type===0x4E4F534A)return JSON.parse(bytes.subarray(position,position+size).toString('utf8').replace(/\0+$/,'').trimEnd());
    position+=size;
  }
  throw new Error('NO_GLTF_JSON_CHUNK');
}

test('shared source is a real animated skinned GLB, not a Roblox-only marker',()=>{
  const doc=glbJson(source);
  assert.ok(source.byteLength>1000000);
  assert.ok(doc.meshes?.length>0);
  assert.ok(doc.skins?.length>0);
  assert.ok(doc.animations?.length>=6);
  assert.ok(doc.materials?.length>=6);
  const joints=doc.skins.flatMap(s=>s.joints||[]);
  assert.ok(joints.length>=40);
  const channels=doc.animations.flatMap(a=>a.channels||[]);
  assert.ok(channels.some(ch=>ch.target?.path==='rotation'));
  assert.ok(channels.some(ch=>joints.includes(ch.target?.node)),'animations must control actual skinned rig bones');
  assert.ok(doc.meshes.flatMap(x=>x.primitives||[]).some(p=>p.attributes?.JOINTS_0!==undefined&&p.attributes?.WEIGHTS_0!==undefined),'mesh must contain native skin weights');
  assert.equal(catalog.master.path,'assets/shared/humanoid-motion-v1/base-skinned-humanoid.glb');
  assert.equal(catalog.origin.originalPath,'assets/roblox/world-ghosts/native/mesh/bride.glb');
  assert.equal(catalog.master.derivedMotionRuntimeVerified,false);
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.exclusiveToGame,false);
  assert.deepEqual(catalog.targetPlatforms,['UNITY','ROBLOX','WEB']);
});

test('shared humanoid authoring source defines distinct motion and combat variants with one object/clip',()=>{
  const clips=catalog.sourceAuthoredClips.map(x=>x.name);
  assert.equal(clips.length,48);
  assert.equal(new Set(clips).size,31);
  assert.equal(catalog.authoring.actionSourceDefinitions,31);
  assert.equal(catalog.authoring.locomotionSourceDefinitions,17);
});


test('source contains distinct bone-keyed career action and non-combat job motions',()=>{
  const names=[
    'common_samurai_iaido_hq','common_samurai_parry_hq','common_spear_lunge_hq',
    'common_bow_draw_hq','common_bow_release_hq','common_rogue_backstab_hq',
    'common_caster_channel_hq','common_healer_ritual_hq','common_summon_call_hq',
    'common_forge_hammer_hq','common_build_place_hq','common_farm_harvest_hq',
    'common_command_rally_hq','common_merchant_trade_hq','common_vehicle_steer_hq',
    'common_fishing_cast_hq','common_potion_mix_hq'
  ];
  for(const name of names){
    assert.ok(catalog.sourceAuthoredClips.some(x=>x.name===name),name);
    assert.ok(producer.includes("    '"+name+"':"),name);
  }
  assert.match(producer,/CLASS_ACTION_POSES = \{/);
  assert.match(producer,/elif name in CLASS_ACTION_POSES:/);
  assert.match(producer,/profile\['anticipation'\]/);
  assert.match(producer,/profile\['release'\]/);
  assert.match(producer,/rot\(bone_name,\*angles\)/);
  assert.match(producer,/loc\('Hips'/);
  assert.match(producer,/FOCUSED_ACTION_ARTICULATION_STATIC|COMMON_ACTION_ARTICULATION_STATIC/);
  assert.equal(catalog.crossGenreReuse.scope,'COMMON_ASSET_NOT_ROBLOX_ONLY');
  assert.equal(catalog.crossGenreReuse.directCrossPlatformNativeBinaryReuseForbidden,true);
  assert.equal(catalog.authoredSourceIsBakedProductionPass,false);
  const script=String.raw`import ast,sys,json
source=open(sys.argv[1],encoding='utf8').read()
root=ast.parse(source)
assignment=next(node for node in root.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='CLASS_ACTION_POSES' for target in node.targets))
motions=ast.literal_eval(assignment.value)
assert len(motions)==17,len(motions)
signature=set()
for name,row in motions.items():
    a,b=row['anticipation'],row['release']
    assert len(a)>=8 and len(b)>=8,name
    assert all(isinstance(point,(tuple,list)) and 1<=len(point)<=3 for point in list(a.values())+list(b.values())),name
    assert all(-1.6 <= v <= 1.6 for point in list(a.values())+list(b.values()) for v in point),name
    assert all(j in a and j in b for j in ('Hips','Spine','Chest','UpperArmL','UpperArmR','ThighL','ThighR')),name
    assert any(abs(a['UpperArmL'][0]-b['UpperArmL'][0])>.22 or abs(a['UpperArmR'][0]-b['UpperArmR'][0])>.22 for _ in [0]),name
    signature.add(tuple(sorted((k,tuple(v)) for k,v in a.items())))
assert len(signature)==17,len(signature)
print('CLASS_ARTICULATED_POSES=PASS')
`;
  const checked=spawnSync('python3',['-c',script,path.join(dir,'author-motion.py')],{encoding:'utf8',timeout:30000});
  assert.equal(checked.status,0,checked.stderr||checked.stdout);
});

test('common source has per-motion baked bones, original foot contact QA, and cross-platform pending gates',()=>{
  const clips=catalog.sourceAuthoredClips.map(x=>x.name);
  for(const clip of [
    'common_idle_hq','common_walk_hq','common_run_hq','common_sprint_hq',
    'common_light_attack_1_hq','common_light_attack_2_hq','common_light_attack_3_hq',
    'common_heavy_attack_1_hq','common_heavy_attack_2_hq',
    'common_guard_raise_hq','common_guard_hold_hq','common_parry_hq',
    'common_dodge_left_hq','common_dodge_right_hq','common_hit_front_hq',
    'common_hit_back_hq','common_death_front_hq','common_cast_burst_hq'
  ])assert.ok(clips.includes(clip),clip);
  assert.match(producer,/PARSER\.add_argument\('--focus'/);
  assert.match(producer,/EXPORT_CLIPS = \{ARGS\.focus:CLIPS\[ARGS\.focus\]\}/);
  assert.match(producer,/for clip_name, duration in EXPORT_CLIPS\.items\(\)/);
  assert.match(producer,/common-humanoid-motion-v1\.glb/);
  assert.match(producer,/stabilize_planted_feet\(t, GAIT_NAME_TO_PACE\[name\]\)/);
  assert.match(producer,/FOOT_CONTACT_DRIFT/);
  assert.match(producer,/COMMON_ACTION_ARTICULATION_STATIC/);
  assert.match(producer,/COMMON_ACTION_ARM_SWING_MISSING/);
  assert.match(producer,/bone\.location = original_location \+ local_to_world\.inverted\(\) @ delta_world/);
  assert.match(producer,/pose_bone\.name in \('Hips', 'FootL', 'FootR'\)/);
  assert.match(producer,/preview_times=\{ARGS\.focus:0\.5\}/);
  assert.match(producer,/productionVerified': False/);
  assert.match(producer,/nativeStudioVerified': False/);
  assert.match(producer,/platformNativeAdapters/);
  assert.match(producer,/action_pose\(name,t\)/);
  assert.doesNotMatch(producer,/\bRIG\['ProductionVerified'\] = True/);
  assert.equal(catalog.authoring.workUnit.defaultActiveEditingBudgetMinutes,60);
  assert.equal(catalog.authoring.workUnit.motionCount,1);
  assert.equal(catalog.authoring.workUnit.actualTimeSpentVerified,null);
  assert.equal(catalog.newMotionGlbFilesCommitted,0);
  const py=spawnSync('python3',['-c','import ast,sys;ast.parse(open(sys.argv[1],encoding="utf-8").read());print("SHARED_MOTION_PYTHON_AST=PASS")',path.join(dir,'author-motion.py')],{encoding:'utf8',timeout:30000});
  assert.equal(py.status,0,py.stderr||py.stdout);
});

test('shared master is registered in the original company library without platform QA forgery',()=>{
  const lib=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const asset=lib.assets.find(x=>x.id==='shared-humanoid-motion-v1');
  assert.ok(asset);
  assert.equal(asset.platform,'SHARED_NATIVE_SOURCE');
  assert.equal(asset.companyCommonBase,true);
  assert.equal(asset.productionVerified,false);
  assert.equal(asset.runtimeVerificationState,'PENDING_STUDIO');
  assert.ok(asset.nativeArtifacts.includes('assets/shared/humanoid-motion-v1/base-skinned-humanoid.glb'));
  assert.ok(asset.authoringRecipes.some(x=>x.script==='assets/shared/humanoid-motion-v1/author-motion.py'&&
    x.family==='CHARACTER'&&x.masterGlbRequired===true&&
    x.targetPlatforms.includes('UNITY')&&x.targetPlatforms.includes('ROBLOX')));
});


test('shared 3D library mutations wake the existing 24H producer instead of a shadow pipeline',()=>{
  const workflow=fs.readFileSync(path.join(root,'.github','workflows','vibe2-24h-runner.yml'),'utf8');
  const continuous=fs.readFileSync(path.join(root,'.github','workflows','vibe2-continuous-core.yml'),'utf8');
  assert.match(workflow,/^\s*- 'assets\/shared\/\*\*'$/m);
  assert.match(workflow,/^\s*- 'company-asset-library\.json'$/m);
  assert.match(workflow,/VIBE2_ASSET_DEVELOPMENT_MAX: '63'/);
  assert.match(workflow,/execution_lane: asset-development/);
  assert.match(continuous,/asset-development/);
  assert.match(continuous,/Execute declared native DCC authoring verification/);
  assert.equal(catalog.productionVerified,false);
});
