import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'web-games/cozy-island/game-v3.js'),'utf8');
const view=fs.readFileSync(path.join(root,'web-games/cozy-island/stronghold-3d.mjs'),'utf8');
const html=fs.readFileSync(path.join(root,'web-games/cozy-island/index.html'),'utf8');

function isolatedStateHelpers(){
  // Only evaluate source-defined pure state/collision helpers, not DOM or gameplay.
  const constants=source.slice(source.indexOf("const GAME_ID="),source.indexOf("const world="));
  const normalizer=source.slice(source.indexOf("function normalizeState(raw){"),source.indexOf("function saveSoon()"));
  const collision=source.slice(source.indexOf("function fortCollision(part,x,y,margin=0){"),source.indexOf("function siegeWall(u,nx,ny){"));
  assert.ok(constants.length>100&&normalizer.length>100&&collision.length>100,'pure helper anchors must exist');
  return new Function(constants+'\n'+normalizer+'\n'+collision+'\nreturn {normalizeState,fortCollision,FORT_BUILD,DEFAULT_STATE};')();
}

test('old cozy-island saves retain version, inventory, army, growth, and player while adding fortress',()=>{
  const {normalizeState}=isolatedStateHelpers();
  const saved={version:3,coins:117,day:4,inventory:{wood:17,stone:12,seeds:2,food:21},
    player:{x:822,y:702},army:[{kind:'soldier'},{kind:'archer'}],
    plots:Array.from({length:6},()=>({state:'growing',watered:true,wateredAt:13,ready:false})),
    productionBuildings:{lumberBuilt:true}};
  const next=normalizeState(saved);
  assert.equal(next.version,3);
  assert.equal(next.coins,117);
  assert.equal(next.day,4);
  assert.equal(next.inventory.wood,17);
  assert.equal(next.inventory.food,21);
  assert.deepEqual(next.army,saved.army);
  assert.deepEqual(next.player,saved.player);
  assert.equal(next.plots[0].wateredAt,13);
  assert.deepEqual(next.productionBuildings,saved.productionBuildings);
  assert.deepEqual(next.fortress,{parts:[],gateOpen:false});
});

test('fortress state restores health, gate operation, orientation and applies bounds',()=>{
  const {normalizeState,FORT_BUILD}=isolatedStateHelpers();
  assert.deepEqual(Object.keys(FORT_BUILD).sort(),['gate','keep','tower','wall']);
  const next=normalizeState({fortress:{gateOpen:true,parts:[
    {id:'a',kind:'wall',axis:'z',x:300,y:480,hp:100},
    {id:'b',kind:'keep',axis:'x',x:600,y:650,hp:99999},
    {kind:'broken',x:1,y:1,hp:5}
  ]}});
  assert.equal(next.fortress.gateOpen,true);
  assert.equal(next.fortress.parts.length,2);
  assert.equal(next.fortress.parts[0].axis,'z');
  assert.equal(next.fortress.parts[0].hp,100);
  assert.equal(next.fortress.parts[1].hp,FORT_BUILD.keep.hp);
});

test('defense collision tracks wall direction, tower size, and unit clearance',()=>{
  const {fortCollision}=isolatedStateHelpers();
  assert.equal(fortCollision({kind:'wall',axis:'x',x:300,y:300},333,300),true);
  assert.equal(fortCollision({kind:'wall',axis:'x',x:300,y:300},300,332),false);
  assert.equal(fortCollision({kind:'wall',axis:'z',x:300,y:300},300,332),true);
  assert.equal(fortCollision({kind:'wall',axis:'z',x:300,y:300},333,300),false);
  assert.equal(fortCollision({kind:'tower',axis:'x',x:300,y:300},336,336),true);
  assert.equal(fortCollision({kind:'gate',axis:'x',x:300,y:300},340,300,7),true);
});

test('3D runtime uses real WebGL, 3D pick ray, original CC0 motion, and fallback path',()=>{
  assert.match(view,/new THREE\.WebGLRenderer/);
  assert.match(view,/new THREE\.OrthographicCamera/);
  assert.match(view,/raycaster\.ray\.intersectPlane/);
  assert.match(view,/new THREE\.MeshStandardMaterial/);
  assert.match(view,/rogue\.glb/);
  assert.match(view,/Running_A/);
  assert.match(view,/fadeIn\(\.13\)/);
  assert.match(source,/import\('\.\/stronghold-3d\.mjs'\)/);
  assert.match(source,/canvas\.style\.opacity='1'/);
  assert.match(html,/type="importmap"/);
  assert.match(html,/id="buildButton"/);
});
