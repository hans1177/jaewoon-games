// Verify downloaded native 3D asset identity before any Magic Forest release.
// Static/source evidence is not a substitute for WebGL and mobile gameplay QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const home='assets/shared/homely-house/';
const names=['tree','tree_large','foliage_A','cobblestones','bench_A','fence_straight','house','gate_single','package'];
const index=fs.readFileSync('web-games/fantasy-survival/index.html','utf8');
const moduleSource=fs.readFileSync('web-games/fantasy-survival/world3d.mjs','utf8');
const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('assets/asset-license-ledger.json','utf8'));

test('native preview binds actual downloaded CC0 OBJ sources with matching SHA256',()=>{
 const legal=ledger.entries.find(e=>e.id==='tinytreats-homely-house-cc0-v1');
 assert.ok(legal);
 assert.equal(legal.license,'CC0');
 assert.equal(legal.commercialUse,true);
 assert.equal(legal.modificationUse,true);
 assert.equal(legal.evidence.sourceGeometryQa,'OBJ_STATIC_GEOMETRY_PASS');
 for(const name of names){
  const path='/'+home+name+'.obj';
  const source=fs.readFileSync(path.slice(1));
  const item=registry.assets.find(a=>a.path===path);
  assert.ok(item,'registry missing: '+name);
  assert.equal(item.license,'CC0');
  assert.match(item.sourceUrl,/Tiny-Treats-Homely-House-1\.0/);
  assert.equal(createHash('sha256').update(source).digest('hex'),item.sourceHash,'downloaded source SHA256 drift: '+name);
  const text=source.toString('utf8');
  assert.match(text,/^v -?\d/m);
  assert.match(text,/^f \d/m);
  assert.match(moduleSource,new RegExp("'"+name+"'"));
 }
});
test('native scene is an opt-in internal render path, not a false production 3D declaration',()=>{
 assert.match(moduleSource,/WebGLRenderer/);
 assert.match(moduleSource,/Float32BufferAttribute/);
 assert.match(moduleSource,/computeVertexNormals/);
 assert.match(moduleSource,/raycaster\.intersectObjects/);
 assert.match(moduleSource,/function frame\(state\)/);
 assert.match(moduleSource,/if\(state\.area!=='surface'/);
 assert.match(index,/data-spatial-dimension="2d"/);
 assert.match(index,/id="world3d"/);
 assert.match(index,/get\('preview3d'\)==='1'/);
 assert.match(index,/world3d\.frame\(state\)/);
 assert.match(index,/world3d\?\.pick\(e\.clientX,e\.clientY\)/);
 assert.match(index,/world3d\)world3d\.dispose\(\)/);
});

test('3D preview reads existing biome classifier and saved construction state, never regenerates the map',()=>{
 assert.match(index,/world3d\.frame\(state,regionAt\)/);
 assert.match(moduleSource,/function frame\(state,regionAt\)/);
 assert.match(moduleSource,/const classify=typeof regionAt==='function'\?regionAt:/);
 assert.match(moduleSource,/const tileBiome=String\(classify\(gx\/SCALE,gz\/SCALE\)/);
 assert.match(moduleSource,/for\(const \[i,door\] of \(state\.doors\|\|\[\]\)\.entries\(\)\)/);
 assert.match(moduleSource,/for\(const \[i,chest\] of \(state\.chests\|\|\[\]\)\.entries\(\)\)/);
 assert.match(moduleSource,/addVisibleEntity\('door:'\+/);
 assert.match(moduleSource,/addVisibleEntity\('chest:'\+/);
 assert.match(moduleSource,/getBiome:\(\)=>currentBiome/);
 assert.match(index,/function regionAt\(x,y\)/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});
