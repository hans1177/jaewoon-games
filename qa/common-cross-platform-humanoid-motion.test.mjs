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
  assert.equal(clips.length,45);
  assert.equal(new Set(clips).size,31);
  assert.equal(catalog.authoring.actionSourceDefinitions,28);
  assert.equal(catalog.authoring.locomotionSourceDefinitions,17);
});


test('shared skinned author directly authors distinct career-specific joint keyframes, not name-only markers',()=>{
  const expected=[
    'common_samurai_iai_draw_hq','common_samurai_parry_counter_hq','common_knight_shield_bash_hq',
    'common_monk_palm_combo_hq','common_archer_draw_release_hq','common_mage_area_cast_hq',
    'common_assassin_backstep_cut_hq','common_lancer_thrust_hq','common_healer_wave_hq',
    'common_summoner_ritual_hq','common_blacksmith_hammer_hq','common_bard_performance_hq',
    'common_mechanist_gadget_hq','common_farmer_harvest_hq'
  ];
  const names=new Set(catalog.sourceAuthoredClips.map(x=>x.name));
  const bound=new Map(catalog.careerMotionBindings.map(x=>[x.clip,x]));
  for(const name of expected){
    assert.ok(names.has(name),name);
    const row=bound.get(name);
    assert.ok(row?.sourceClipDefinition,row?.clip);
    assert.equal(row.actualJointPoseDefinition,true);
    assert.equal(row.productionVerified,false);
    assert.equal(row.verifiedRuntime,false);
    assert.equal(row.platformNativeAdaptationRequired,true);
  }
  assert.equal(catalog.authoring.careerActionPoseCount,14);
  assert.equal(catalog.authoring.careerDerivedMotionBakesVerified,false);
  assert.equal(catalog.authoring.careerGripContactAndStyleRuntimeVerified,false);
  assert.equal(catalog.sourceAuthoredClips.length,45);
  assert.equal(catalog.crossGenreReusability.motionProjection,'createCommonCareerMotionLoadout');
  assert.equal(catalog.crossGenreReusability.gameplayBalanceAuthority,false);
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.newMotionGlbFilesCommitted,0);
  assert.match(producer,/CLASS_ACTION_POSES = \{/);
  assert.match(producer,/CLASS_ACTION_CLIPS = tuple\(CLASS_ACTION_POSES\)/);
  assert.match(producer,/elif name in CLASS_ACTION_CLIPS:/);
  assert.match(producer,/rot\('UpperArmL',pose\[6\]/);
  assert.match(producer,/rot\('UpperArmR',pose\[8\]/);
  assert.match(producer,/rot\('ThighL',pose\[10\]/);
  assert.match(producer,/action_pose\(name,t\)/);
  const program=[
    'import ast,json,sys',
    'tree=ast.parse(open(sys.argv[1],encoding="utf-8").read())',
    'node=next(x for x in tree.body if isinstance(x,ast.Assign) and any(isinstance(t,ast.Name) and t.id=="CLASS_ACTION_POSES" for t in x.targets))',
    'print(json.dumps(ast.literal_eval(node.value)))'
  ].join(';');
  const result=spawnSync('python3',['-c',program,path.join(dir,'author-motion.py')],{encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const poses=JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(poses).sort(),[...expected].sort());
  assert.equal(new Set(Object.values(poses).map(row=>JSON.stringify([row.anticipation,row.release]))).size,14,'class silhouettes cannot differ by playback speed alone');
  for(const [name,row] of Object.entries(poses)){
    assert.ok(row.windup>0&&row.contact>row.windup&&row.contact<.9,name);
    assert.equal(row.anticipation.length,12,name);
    assert.equal(row.release.length,12,name);
    assert.ok(row.anticipation.every(Number.isFinite),name);
    assert.ok(row.release.every(Number.isFinite),name);
    assert.ok(Math.abs(row.anticipation[6]-row.release[6])>.12||Math.abs(row.anticipation[8]-row.release[8])>.12,name+' actual striking-arm rotation');
  }
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
