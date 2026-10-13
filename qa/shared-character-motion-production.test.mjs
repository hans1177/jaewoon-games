// Verify source-authored shared motions, true foot-contact correction, and pending studio QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const motionPath=new URL('../assets/roblox/world-ghosts/refine-humanoid-motion.py',import.meta.url);
const native=fs.readFileSync(motionPath,'utf8');
const planner=fs.readFileSync(new URL('../assets/vibe-studio-asset-universe.js',import.meta.url),'utf8');
const catalog=JSON.parse(fs.readFileSync(new URL('../assets/roblox/common-motion-v1/catalog.json',import.meta.url),'utf8'));

test('existing Roblox R15 common actions remain authored source, not production clips',()=>{
  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(catalog.compatibleRig,'R15');
  assert.equal(catalog.sourceType,'KEYFRAME_SEQUENCE_SOURCE');
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(catalog.atoms.length,61);
  const names=new Set(catalog.atoms.map(row=>row.atomId));
  for(const action of [
    'LIGHT_ATTACK_1','HEAVY_ATTACK_1','RANGED_DRAW_SHOT','CAST_BURST',
    'BLOCK_RAISE','BLOCK_HOLD','PARRY_PERFECT','GUARD_BREAK','COUNTER_READY',
    'DODGE_LEFT','DODGE_RIGHT','ROLL_FORWARD','HIT_FRONT','HIT_BACK',
    'DEATH_FRONT','REVIVE_HELP','EQUIP_DRAW','UNEQUIP_STOW','INTERACT_USE'
  ])assert.ok(names.has(action),'missing existing authored source: '+action);
  for(const row of catalog.atoms)assert.equal(row.productionVerified,false,row.atomId);
});

test('Blender motion actually corrects planted foot positions without weakening QA',()=>{
  const clips=native.slice(native.indexOf('CLIPS = {'),native.indexOf('\nFOUNDATION_TARGET_MOTION_COUNT'));
  assert.equal([...clips.matchAll(/'hero_[a-z0-9_]+':\s*[0-9.]+/g)].length,17);
  assert.match(native,/FOUNDATION_TARGET_MOTION_COUNT = 40/);
  assert.match(native,/'hero_walk_hq': 0\.035/,'do not widen grounded gait threshold');
  assert.match(native,/qa_failures\.append\(f'FOOT_CONTACT_DRIFT:/);
  assert.match(native,/GAIT_CONTACT_ANCHORS/);
  assert.match(native,/RIG\.matrix_world @ bone\.matrix\.translation/);
  assert.match(native,/stabilize_planted_feet\(t, GAIT_NAME_TO_PACE\[name\]\)/);
  assert.match(native,/delta_world = Vector\(\(desired\.x - current\.x, 0\.0, desired\.z - current\.z\)\)/);
  assert.match(native,/local_to_world\.inverted\(\) @ delta_world/);
  assert.match(native,/if abs\(local_to_world\.determinant\(\)\) < 1e-8/);
  assert.match(native,/pose_bone\.name in \('Hips', 'FootL', 'FootR'\)/);
  assert.match(native,/assert not qa_failures, 'MOTION_STATIC_QA_FAILED:/);
  assert.match(native,/'productionVerified': False/);
});

test('missing combos and weapon styles remain real production demand, not invented clips',()=>{
  const missing=[
    'LIGHT_COMBO_2_3_4_CHAIN_FAMILY','HEAVY_COUNTER_FOLLOWUP_FAMILY',
    'SWORD_AXE_HAMMER_SPEAR_WEAPON_STANCE_FAMILY',
    'DODGE_FORWARD_BACK_LEFT_RIGHT_CONTACT_FAMILY',
    'BLOCK_PARRY_RIPOSTE_RECOVERY_FAMILY',
    'DIRECTIONAL_LIGHT_MEDIUM_HEAVY_HIT_REACTION_FAMILY',
    'KNOCKDOWN_GETUP_VARIATIONS_FAMILY','FOOT_PLANT_WEIGHT_TRANSFER_ACTUAL_QA_FAMILY'
  ];
  for(const key of missing)assert.ok(planner.includes("'"+key+"'"),'missing worklist demand: '+key);
  assert.ok(!catalog.atoms.some(row=>row.atomId==='LIGHT_ATTACK_2'));
});

test('procedural poses detach stale actions before dependency updates and bind only for key insertion',()=>{
  const reset=native.slice(native.indexOf('def reset_pose():'),native.indexOf('\ndef rot('));
  assert.ok(reset.indexOf('RIG.animation_data.action = None')>=0);
  assert.ok(reset.indexOf('RIG.animation_data.action = None')<reset.indexOf('for pose_bone in RIG.pose.bones:'));
  const bake=native.slice(native.indexOf('for clip_name, duration in CLIPS.items():'),native.indexOf('# 실제 관절 샘플 기반 QA'));
  const pose=bake.indexOf('animate(clip_name, frame / max(1, frame_count))');
  const attach=bake.indexOf('RIG.animation_data.action = action');
  assert.ok(pose>=0&&attach>pose&&attach<bake.indexOf("pose_bone.keyframe_insert('rotation_euler'"));
  assert.match(native,/'loopRotationMaxRad': 0\.015/);
  assert.match(native,/'loopLocationMax': 0\.004/);
  assert.match(native,/assert not qa_failures, 'MOTION_STATIC_QA_FAILED:/);
});

test('native Blender source parses under Python without falsely claiming Blender QA',()=>{
  const py='import ast,sys; ast.parse(open(sys.argv[1],encoding="utf-8").read()); print("MOTION_PYTHON_SYNTAX=PASS")';
  const r=spawnSync('python3',['-c',py,fileURLToPath(motionPath)],{encoding:'utf8',timeout:15000});
  if(r.error?.code==='ENOENT')return;
  assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(r.stdout,/MOTION_PYTHON_SYNTAX=PASS/);
});

test('draft asset verification keeps generated outputs out of the source PR',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/roblox-world-ghost-assets.yml',import.meta.url),'utf8');
  const commitStep=workflow.slice(workflow.indexOf('- name: Commit verified native packages and authored assets to PR branch'));
  assert.match(commitStep,/if: github\.event_name == 'pull_request' && github\.event\.pull_request\.draft == false/);
  assert.match(workflow,/blender --background --python-exit-code 1 --python qa\/shared-character-motion-action-isolation\.py/);
  assert.match(workflow,/blender --background --python-exit-code 1 --python assets\/roblox\/world-ghosts\/refine-humanoid-motion\.py/);
});

