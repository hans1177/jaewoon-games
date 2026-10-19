// Native 3D contract: prevents false "3D" passes backed by a 2D gameplay canvas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const page=fs.readFileSync(path.join(root,'web-games/wild-survival/index.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'web-games/wild-survival/wild3d.mjs'),'utf8');

test('wild survival presents actual Three.js/WebGL 3D and not a 2D renderer',()=>{
  assert.match(page,/type="importmap"/);
  assert.match(page,/type="module"/);
  assert.match(page,/import\s*\{\s*createWild3D\s*\}\s*from\s*['"]\.\/wild3d\.mjs['"]/);
  assert.match(page,/data-render-target="webgl-3d"/);
  assert.doesNotMatch(page,/\bgetContext\s*\(\s*['"]2d['"]/i);
  assert.doesNotMatch(runtime,/\bgetContext\s*\(\s*['"]2d['"]/i);
  assert.match(runtime,/new THREE\.WebGLRenderer\s*\(/);
  assert.match(runtime,/new THREE\.PerspectiveCamera\s*\(/);
  assert.match(runtime,/renderer\.render\s*\(\s*scene\s*,\s*camera\s*\)/);
  assert.match(runtime,/document\.body\.dataset\.spatialDimension\s*=\s*['"]3d['"]/);
  assert.match(runtime,/canvas\.dataset\.renderedFrame\s*=\s*['"]true['"]/);
  assert.match(page,/3D 실행 실패/);
  assert.match(runtime,/webglcontextlost/);
});
test('3D scene consumes live authoritative survival entities and native asset',()=>{
  assert.match(runtime,/resources\.map\s*\(/);
  assert.match(runtime,/animals\.map\s*\(/);
  assert.match(runtime,/resources\[i\]\.amount/);
  assert.match(runtime,/animal\.dead/);
  assert.match(runtime,/animal\.x\/SCALE/);
  assert.match(runtime,/p\.x\/SCALE/);
  assert.match(runtime,/S\.camp\.shelter/);
  assert.match(runtime,/S\.camp\.fire/);
  assert.match(runtime,/S\.weather/);
  assert.match(runtime,/S\.time/);
  assert.match(runtime,/GLTFLoader/);
  assert.match(runtime,/humanoid-traveler\.glb/);
});
test('survival rules and save semantics remain in the original game',()=>{
  assert.match(page,/const SAVE_KEY='jg-wild-survival-v1'/);
  assert.match(page,/function updatePlayer\s*\(/);
  assert.match(page,/function updateAnimals\s*\(/);
  assert.match(page,/function worldMinute\s*\(/);
  assert.match(page,/function attack\s*\(/);
  assert.match(page,/function interact\s*\(/);
  assert.match(page,/function craft\s*\(/);
  assert.match(page,/function save\s*\(/);
  assert.match(page,/requestAnimationFrame\(loop\)/);
  assert.doesNotMatch(page,/function drawAnimal\s*\(/);
  assert.doesNotMatch(page,/\bctx\./i);
  assert.match(page,/if\(!wild3d\)return/);
});

test('Wild Forest source-only mandate rejects procedural placeholder meshes',()=>{
  assert.match(page,/createWild3D\(\{canvas,WORLD,resources,animals\}\)\.then\(/);
  assert.doesNotMatch(page,/\bgetContext\s*\(\s*['"]2d['"]/i);
  assert.doesNotMatch(runtime,/\bnew\s+THREE\.(?:BoxGeometry|ConeGeometry|SphereGeometry|IcosahedronGeometry|CylinderGeometry|DodecahedronGeometry|PlaneGeometry)\b/);
  assert.match(runtime,/OBJLoader/);
  assert.match(runtime,/MTLLoader/);
  assert.match(runtime,/FBXLoader/);
  assert.match(runtime,/loadOriginalBunny/);
  assert.match(runtime,/cube-pets\.zip/);
  assert.match(runtime,/animal-bunny/);
  assert.match(runtime,/Deer\.fbx/);
  assert.match(runtime,/boar/);
  assert.match(runtime,/humanoid-traveler\.glb/);
  assert.match(runtime,/floor_base/);
  assert.match(runtime,/tree_large/);
  assert.match(runtime,/originalNodes\.forEach/);
  assert.match(runtime,/creatures\.forEach/);
  assert.match(runtime,/resources\[i\]\.amount/);
  assert.match(runtime,/animals\[i\]/);
  assert.match(runtime,/fail\('Kenney cube-pets archive lacks animal-bunny original model'\)/);
  assert.match(runtime,/document\.body\.dataset\.nativeOriginalAnimalSpecies/);
  assert.match(runtime,/renderer\.render\(scene,camera\)/);
  assert.doesNotMatch(runtime,/\b(?:makeAnimal|makeTree|makeHuman|makeTent|makeFire)\s*\(/);
});
