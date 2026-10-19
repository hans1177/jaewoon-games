// Original-asset mobile 3D contract; source checks cannot replace browser runtime evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assetDir=path.join(root,'web-games/wild-survival/assets');
const page=fs.readFileSync(path.join(root,'web-games/wild-survival/index.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'web-games/wild-survival/wild3d.mjs'),'utf8');
const sources=JSON.parse(fs.readFileSync(path.join(assetDir,'sources.json'),'utf8'));
const originalNames=['rabbit','deer','bear','wolf','fox','redsquirrel','barnowl',
 'tree_oak','tree_detailed','tree_fat','tree_pineDefaultA','plant_bush','grass',
 'plant_flatTall','rock_smallA','rock_largeA','stone_tallA','flower_redA','mushroom_red'];

test('real WebGL-only mobile game, no Canvas2D or procedural entity models',()=>{
  assert.match(page,/type="importmap"/);
  assert.match(page,/type="module"/);
  assert.match(page,/createWild3D/);
  assert.match(page,/data-render-target="webgl-3d"/);
  assert.doesNotMatch(page,/\bgetContext\s*\(\s*['"]2d['"]/i);
  assert.doesNotMatch(runtime,/\bgetContext\s*\(\s*['"]2d['"]/i);
  assert.doesNotMatch(runtime,/new THREE\.(BoxGeometry|SphereGeometry|CylinderGeometry|ConeGeometry|IcosahedronGeometry|DodecahedronGeometry)/);
  assert.match(runtime,/new THREE\.WebGLRenderer\s*\(/);
  assert.match(runtime,/new THREE\.PerspectiveCamera\s*\(/);
  assert.match(runtime,/renderer\.render\s*\(\s*scene\s*,\s*camera\s*\)/);
  assert.match(runtime,/webglcontextlost/);
  assert.match(runtime,/powerPreference:'low-power'/);
  assert.match(runtime,/GLTFLoader/);
  assert.match(runtime,/OBJLoader/);
  assert.match(runtime,/MTLLoader/);
});
test('all 19 vendored 3D originals are valid GLB headers with retained license provenance',()=>{
  assert.equal(sources.noGeneratedModels,true);
  assert.equal(sources.platform,'mobile-webgl');
  assert.equal(sources.sources.length,19);
  for(const id of originalNames){
    const meta=sources.sources.find(x=>x.name===id);
    assert.ok(meta,'original model must have provenance: '+id);
    assert.equal(meta.license,'MIT');
    assert.match(meta.sourceBlobSha,/^[0-9a-f]{40}$/);
    const b=fs.readFileSync(path.join(assetDir,id+'.glb'));
    assert.equal(b.toString('ascii',0,4),'glTF','binary GLB: '+id);
    assert.ok(b.length>500);
    if(id!=='wolf')assert.match(runtime,new RegExp(id+'\\.glb'));
  }
  const notices=fs.readFileSync(path.join(assetDir,'THIRD_PARTY_LICENSES.md'),'utf8');
  assert.match(notices,/MIT License/);
  assert.match(notices,/vsim contributors/);
  assert.match(notices,/Anthony Schemel/);
  assert.match(runtime,/assets\/shared\/humanoid-traveler-actions\.glb/);
  assert.match(runtime,/monster-adventure-v1\/boar\.obj/);
  assert.match(runtime,/survival-core-world-v1\/roof_gable\.obj/);
});
test('eight real-asset hunt species use AI movement, prey/predators and saved rewards',()=>{
  for(const animal of ['rabbit','deer','boar','bear','wolf','fox','redsquirrel','barnowl']){
    assert.match(page,new RegExp('  '+animal+":\\{name:"));
    assert.match(runtime,new RegExp(animal+":\\{file:|  boar:\\{model:"));
  }
  assert.match(page,/function newAnimal\s*\(/);
  assert.match(page,/function updateAnimals\s*\(/);
  assert.match(page,/function attack\s*\(/);
  assert.match(page,/SPECIES\[a\.type\]/);
  assert.match(page,/species\.behavior==='predator'/);
  assert.match(page,/species\.behavior==='territorial'/);
  assert.match(page,/const forward=\(\(a\.x-p\.x\)/);
  assert.match(page,/S\.hunts\[best\.type\]/);
  assert.match(page,/const SAVE_KEY='jg-wild-survival-v1'/);
  assert.match(page,/function save\s*\(/);
  assert.match(page,/function interact\s*\(/);
  assert.match(page,/function craft\s*\(/);
  assert.match(page,/function worldMinute\s*\(/);
  assert.match(runtime,/resources\.length/);
  assert.match(runtime,/animals\.length/);
  assert.match(runtime,/animal\.dead<=0/);
});
test('fixed Grounded-inspired third-person camera and mobile joystick map',()=>{
  assert.match(runtime,/CAMERA_DISTANCE=7\.2/);
  assert.match(runtime,/CAMERA_HEIGHT=4\.0/);
  assert.match(runtime,/CAMERA_SHOULDER=\.56/);
  assert.match(runtime,/function mapInput\s*\(/);
  assert.match(runtime,/camera\.lookAt\(cameraAim\)/);
  assert.match(runtime,/dataset\.cameraMode='fixed-third-person'/);
  assert.match(page,/wild3d\.mapInput\(x,y\)/);
  assert.match(page,/stick\.addEventListener\('pointerdown'/);
  assert.match(page,/stick\.addEventListener\('pointermove'/);
  assert.doesNotMatch(page,/function drawAnimal\s*\(/);
});
