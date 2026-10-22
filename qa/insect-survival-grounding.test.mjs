// Real-world CC0 terrain geometry and visual grounding regression.
// Gameplay / damage / save state are intentionally outside this render-only fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const renderFile=path.join(root,'web-games/insect-survival/world3d.mjs');
const render=fs.readFileSync(renderFile,'utf8');
const floor=fs.readFileSync(path.join(root,'assets/shared/homely-house/floor_base.obj'),'utf8');
const game=fs.readFileSync(path.join(root,'web-games/insect-survival/index.html'),'utf8');

function objBounds(text){
  const points=text.split(/\r?\n/).filter(line=>line.startsWith('v ')).map(row=>row.trim().split(/\s+/).slice(1,4).map(Number));
  assert.ok(points.length>=4,'original CC0 OBJ vertices required');
  const get=axis=>({min:Math.min(...points.map(p=>p[axis])),max:Math.max(...points.map(p=>p[axis]))});
  return {x:get(0),y:get(1),z:get(2)};
}
function renderingConstants(){
  const params=/const ratio=([\d.]+),GROUND_SURFACE_Y=([\d.-]+),FOOT_CLEARANCE=([\d.]+),GROUND_TILE_SPAN=([\d.]+);/.exec(render);
  assert.ok(params,'ground plane/foot constants must remain explicit');
  return params.slice(1).map(Number);
}

test('3D renderer module parses without changing original CC0 model files',()=>{
  const run=spawnSync(process.execPath,['--check',renderFile],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(render,/floor=derived\('floor',\.18,/);
  assert.match(render,/rogue\.glb/);
  assert.match(render,/monster-53\.obj/);
});

test('CC0 floor tile pitch matches its actual OBJ footprint and the playable map',()=>{
  const b=objBounds(floor);
  const [ratio,surface,footGap,span]=renderingConstants();
  assert.ok(ratio>0&&footGap>0&&footGap<.1);
  assert.equal(surface,0);
  assert.ok(span>0);
  const floorHeight=.18;
  const nativeHeight=b.y.max-b.y.min;
  const normalize=floorHeight/nativeHeight;
  const visualWidth=(b.x.max-b.x.min)*normalize;
  const visualDepth=(b.z.max-b.z.min)*normalize;
  assert.ok(visualWidth>0&&visualDepth>0);
  const scaleX=span/visualWidth,scaleZ=span/visualDepth;
  assert.ok(Math.abs(visualWidth*scaleX-span)<1e-9);
  assert.ok(Math.abs(visualDepth*scaleZ-span)<1e-9);
  // Normalization offsets the bottom to 0 and top to +0.18.
  // The new tileY places the top at world ground 0, not +0.18.
  const originalTop=b.y.max*normalize;
  const normalizedModelY=-b.y.min*normalize;
  const topAfterPlacement=originalTop+(surface+normalizedModelY-(originalTop+normalizedModelY));
  assert.ok(Math.abs(topAfterPlacement-surface)<1e-9);
  assert.ok(footGap>topAfterPlacement,'hero feet stand above the CC0 floor');
  assert.match(render,/GROUND_TILE_SPAN\/floorSize\.x/);
  assert.match(render,/GROUND_TILE_SPAN\/floorSize\.z/);
  assert.match(render,/floor\.position\.y-floorBounds\.max\.y/);
  assert.doesNotMatch(render,/panel\.scale\.x\*=13\.8/,'old overlapping CC0 tiles must stay removed');
});

test('seam foundation is local geometry below CC0 surface, not an asset replacement',()=>{
  assert.match(render,/new THREE\.PlaneGeometry\(fieldWidth,fieldDepth\)/);
  assert.match(render,/GROUND_SURFACE_Y-\.025/);
  assert.match(render,/world\.add\(panel\)/);
  assert.match(render,/Math\.ceil\(frame\.world\.w\*ratio\/GROUND_TILE_SPAN\)/);
  assert.match(render,/Math\.ceil\(frame\.world\.h\*ratio\/GROUND_TILE_SPAN\)/);
});

test('character, insects, and resources use the same ground reference, existing save is unchanged',()=>{
  assert.match(render,/new THREE\.Vector3\(p\.x\*ratio,GROUND_SURFACE_Y\+FOOT_CLEARANCE,p\.y\*ratio\)/);
  assert.match(render,/actor\.position\.set\(b\.x\*ratio,GROUND_SURFACE_Y\+FOOT_CLEARANCE,b\.y\*ratio\)/);
  assert.match(render,/resources\[i\]\.position\.set\(frame\.nodes\[i\]\.x\*ratio,GROUND_SURFACE_Y\+FOOT_CLEARANCE/);
  assert.match(game,/const SAVE_KEY='jaewoon_insect_survival_v3'/);
  assert.match(game,/window\.insectWorldSnapshot=/);
});

test('native CC0 animations and fade transitions remain bound to the original clips',()=>{
  for(const name of ['Idle','Running_A','1H_Melee_Attack_Stab','2H_Melee_Attack_Spin','Dodge_Forward','Hit_A','Death_A']){
    assert.ok(render.includes(name),name+' clip missing');
  }
  assert.match(render,/\.fadeOut\(\.13\)/);
  assert.match(render,/\.fadeIn\(\.13\)/);
  assert.match(render,/heroMixer\.update\(dt\)/);
});
