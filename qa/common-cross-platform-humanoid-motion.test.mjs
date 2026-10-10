// 기존 공용 자산 작업자의 실제 3D 원본과 단일 모션 제작 원본을 검증한다.
// Unity Web/Roblox runtime PASS는 각 플랫폼 독립 QA 후에만 인정한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import os from 'node:os';
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


test('six career 3D masters contain distinct skinned geometry and actual joint animation on the shared rig',()=>{
  const roles={
    samurai:'SAMURAI_IAI_DRAW',archer:'ARCHER_DRAW_RELEASE',mage:'MAGE_AREA_CAST',
    rogue:'ROGUE_BACKSTEP_CUT',lancer:'LANCER_SPEAR_THRUST',blacksmith:'BLACKSMITH_FORGE_HAMMER'
  };
  const company=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const sharedSource=path.join(root,'assets','native-authoring','build-shared-humanoid.mjs');
  assert.ok(fs.existsSync(sharedSource));
  const geometryHashes=new Set();
  const binaryHashes=new Set();
  for(const [role,clip] of Object.entries(roles)){
    const relative='assets/shared/humanoid-'+role+'.glb';
    const bytes=fs.readFileSync(path.join(root,relative));
    const doc=glbJson(bytes);
    assert.ok(bytes.length>150000,role);
    assert.equal(doc.skins.length,1,role);
    assert.equal(doc.skins[0].joints.length,19,role);
    assert.equal(doc.animations.length,19,role);
    assert.ok(doc.meshes[0].name.toLowerCase().includes(role),role);
    assert.ok(doc.meshes[0].primitives.every(p=>p.attributes.POSITION!==undefined
      &&p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined),role);
    const specific=doc.animations.find(a=>a.name===clip);
    assert.ok(specific,'role animation missing: '+role);
    const skinNodes=new Set(doc.skins[0].joints);
    const activeJoints=new Set(specific.channels
      .filter(c=>c.target?.path==='rotation'&&skinNodes.has(c.target?.node))
      .map(c=>c.target.node));
    assert.ok(activeJoints.size>=12,role+' must rotate actual skinned joints');
    const jsonBytes=bytes.readUInt32LE(12);
    const geometryStart=20+jsonBytes+8;
    const geometry=createHash('sha256');
    for(const primitive of doc.meshes[0].primitives){
      const accessor=doc.accessors[primitive.attributes.POSITION];
      const view=doc.bufferViews[accessor.bufferView];
      const offset=geometryStart+view.byteOffset+(accessor.byteOffset||0);
      geometry.update(bytes.subarray(offset,offset+view.byteLength));
    }
    geometryHashes.add(geometry.digest('hex'));
    binaryHashes.add(createHash('sha256').update(bytes).digest('hex'));
    const registered=company.assets.find(x=>x.id==='shared-humanoid-'+role);
    assert.ok(registered,'not registered '+role);
    const gitBlobHash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(registered.masterGlbGitBlobSha,gitBlobHash,role);
    assert.equal(registered.masterGlb,relative,role);
    assert.equal(registered.jointCount,19,role);
    assert.equal(registered.animationClipCount,19,role);
    assert.ok(registered.visualIdentityAxes.length>=4,role);
    assert.equal(registered.productionVerified,false,role);
    assert.equal(registered.verifiedCompanyReusable,false,role);
    assert.equal(registered.nativeRuntimeVerified,false,role);
    assert.equal(registered.masterGlbStaticQaPass,false,role);
    assert.equal(registered.platformNativeDerivativeRequired,true,role);
  }
  assert.equal(geometryHashes.size,6,'distinct character silhouettes require distinct vertex geometry');
  assert.equal(binaryHashes.size,6,'no duplicated models under different filenames');
});

test('shared 3D master generator reproduces role models and preserves the original traveler and guardian bytes',()=>{
  const generator=path.join(root,'assets','native-authoring','build-shared-humanoid.mjs');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shared-career-master-'));
  const roles=['samurai','archer','mage','rogue','lancer','blacksmith'];
  try{
    const produced=spawnSync(process.execPath,[generator,dir,'--roles='+roles.join(',')],{encoding:'utf8',timeout:90000});
    assert.equal(produced.status,0,produced.stderr||produced.stdout);
    assert.equal(produced.stdout.trim().split(/\r?\n/).length,6);
    for(const role of roles){
      const name='humanoid-'+role+'.glb';
      assert.ok(fs.readFileSync(path.join(dir,name)).equals(fs.readFileSync(path.join(root,'assets','shared',name))),
        'source regeneration changed '+role);
    }
    const legacy=path.join(dir,'original');
    const initial=spawnSync(process.execPath,[generator,legacy],{encoding:'utf8',timeout:90000});
    assert.equal(initial.status,0,initial.stderr||initial.stdout);
    assert.deepEqual(fs.readdirSync(legacy).sort(),['humanoid-guardian.glb','humanoid-traveler.glb']);
    for(const role of ['traveler','guardian']){
      const name='humanoid-'+role+'.glb';
      assert.ok(fs.readFileSync(path.join(legacy,name)).equals(fs.readFileSync(path.join(root,'assets','shared',name))),
        'original master changed '+role);
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('cross-genre career skills, parries and noncombat actions bake distinct skinned joint trajectories',()=>{
  const variations={
  "samurai": [
    "SAMURAI_PARRY_RIPOSTE",
    "SAMURAI_CRESCENT_CUT",
    "SAMURAI_SHEATH_READY"
  ],
  "archer": [
    "ARCHER_KNEEL_FOCUS",
    "ARCHER_MULTI_SHOT",
    "ARCHER_EVADE_SHOT"
  ],
  "mage": [
    "MAGE_BARRIER_WARD",
    "MAGE_CHAIN_BOLT",
    "MAGE_CHANNEL_RITUAL"
  ],
  "rogue": [
    "ROGUE_DUAL_BLADE_CHAIN",
    "ROGUE_SMOKE_THROW",
    "ROGUE_BACK_DODGE"
  ],
  "lancer": [
    "LANCER_SPEAR_SWEEP",
    "LANCER_SHAFT_PARRY",
    "LANCER_JUMP_THRUST"
  ],
  "blacksmith": [
    "BLACKSMITH_FORGE_REPAIR",
    "BLACKSMITH_BUILD_RAISE",
    "BLACKSMITH_HAMMER_GUARD"
  ]
};
  const first={
    samurai:'SAMURAI_IAI_DRAW',archer:'ARCHER_DRAW_RELEASE',
    mage:'MAGE_AREA_CAST',rogue:'ROGUE_BACKSTEP_CUT',
    lancer:'LANCER_SPEAR_THRUST',blacksmith:'BLACKSMITH_FORGE_HAMMER'
  };
  for(const [career,additional] of Object.entries(variations)){
    const bytes=fs.readFileSync(path.join(root,'assets','shared','humanoid-'+career+'.glb'));
    const doc=glbJson(bytes);
    assert.equal(doc.animations.length,19,career);
    const hashes=[];
    for(const motion of [first[career],...additional]){
      const clip=doc.animations.find(a=>a.name===motion);
      assert.ok(clip,career+':'+motion);
      const hash=createHash('sha256');
      for(const node of [3,6,9,12]){
        const channel=clip.channels.find(row=>row.target.node===node&&row.target.path==='rotation');
        assert.ok(channel,career+':'+motion+' missing skinned joint '+node);
        const access=doc.accessors[clip.samplers[channel.sampler].output];
        const view=doc.bufferViews[access.bufferView];
        const from=20+bytes.readUInt32LE(12)+8+view.byteOffset+(access.byteOffset||0);
        hash.update(bytes.subarray(from,from+access.count*16));
      }
      hashes.push(hash.digest('hex'));
    }
    assert.equal(new Set(hashes).size,4,career+' motions must be physically distinct');
  }
});
