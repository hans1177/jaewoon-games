import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {SPECIES,SPECIES_KEYS,wildlifeSpawnPoint} from '../web-games/wild-survival/wildlife-species.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const page=fs.readFileSync(path.join(root,'web-games/wild-survival/index.html'),'utf8');
const graphics=fs.readFileSync(path.join(root,'web-games/wild-survival/wild3d.mjs'),'utf8');
const world={w:3400,h:2500,riverY:1280,riverH:260};

test('mobile third-person Grounded-like follow is fixed: no first-person option, no 2D fallback',()=>{
  assert.match(graphics,/const CAMERA_DISTANCE=8\.6/);
  assert.match(graphics,/function followThirdPerson\s*\(/);
  assert.match(graphics,/camera\.position\.lerp\s*\(/);
  assert.match(graphics,/canvas\.addEventListener\('pointermove'/);
  assert.match(graphics,/document\.body\.dataset\.cameraMode='third'/);
  assert.match(graphics,/movementVector/);
  assert.match(page,/wild3d\?\.movementVector\(x,y\)/);
  assert.match(page,/data-render-target="webgl-3d"/);
  assert.doesNotMatch(page,/\bgetContext\s*\(\s*['"]2d['"]/i);
  assert.doesNotMatch(graphics,/\bgetContext\s*\(\s*['"]2d['"]/i);
  assert.doesNotMatch(graphics,/\bsetCameraMode\b|\bcameraMode\s*=\s*['"]first['"]/);
  assert.match(page,/오른쪽 화면 드래그/);
});

test('17 ground wildlife species with unique verified names, behaviors, habitats and balanced stats',()=>{
  const expected='bear boar deer elk moose bison wolf coyote fox rabbit raccoon squirrel beaver badger mountain_goat turkey crow'.split(' ');
  assert.deepEqual([...SPECIES_KEYS].sort(),expected.sort());
  for(const id of SPECIES_KEYS){
    const s=SPECIES[id];
    assert.ok(s.name.length>=2,id);
    assert.ok(['prey','predator','charge'].includes(s.kind),id);
    assert.ok(s.hp>0&&s.count>0&&s.speed>0&&s.r>0,id);
    assert.ok(s.meat>=0&&s.hide>=0&&s.bone>=0,id);
    for(const rnd of [()=>0,()=>.5,()=>.99999]){
      const at=wildlifeSpawnPoint(id,world,rnd);
      assert.ok(at.x>=0&&at.x<=world.w&&at.y>=0&&at.y<=world.h,id);
    }
  }
});

test('17-species authority is truly consumed by game state, not only catalog metadata',()=>{
  assert.match(page,/import \{SPECIES,SPECIES_KEYS,wildlifeSpawnPoint\}/);
  assert.match(page,/for\(const type of SPECIES_KEYS\)/);
  assert.match(page,/animals\.push\(\{/);
  assert.match(page,/const spec=SPECIES\[a\.type\]/);
  assert.match(page,/function updateAnimals\s*\(/);
  assert.match(page,/function finishHunt\s*\(/);
  assert.match(page,/function shootBow\s*\(/);
  assert.match(page,/wild3d\.cameraForward\(\)/);
  assert.match(page,/S\.inv\.arrows--/);
  assert.match(page,/function trackWildlife\s*\(/);
  assert.match(page,/wild3d\?\.showTrail\(nearest\)/);
  assert.match(page,/S\.hunting\.kills/);
  assert.match(page,/function renderHuntingCatalog\s*\(/);
  assert.match(page,/const SAVE_KEY='jg-wild-survival-v1'/);
  for(const id of ['shoot','track','huntBook']) assert.match(page,new RegExp('id="'+id+'"'));
});

test('rigged native wolf GLB is actually loaded and skinned, others get custom 3D mesh with limbs',()=>{
  assert.match(graphics,/new GLTFLoader\s*\(/);
  assert.match(graphics,/creature-wolf\.glb/);
  assert.match(graphics,/cloneSkeleton\(source\)/);
  assert.match(graphics,/dataset\.nativeWolfModel='loaded'/);
  assert.match(graphics,/wolfLoader\.load\s*\(/);
  assert.match(graphics,/function makeAnimal\s*\(/);
  assert.match(graphics,/it\.legs\[j\]\.rotation\.x/);
  assert.match(graphics,/it\.animations\?\.update/);
  assert.match(graphics,/render\(scene,camera\)/);
  assert.match(graphics,/new THREE\.WebGLRenderer/);
});
