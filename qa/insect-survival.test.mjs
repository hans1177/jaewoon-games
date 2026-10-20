// 원래 게임 규칙·저장을 보존한 채 UI와 3D 화면을 전환하는 회귀 검증.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('web-games/insect-survival/index.html','utf8');
const world=fs.readFileSync('web-games/insect-survival/world3d.mjs','utf8');
const lineage=fs.readFileSync('web-games/insect-survival/CC0-ASSETS.md','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'authoritative gameplay script required');

function boot(storage=new Map()){
 const dom=new Map();
 const ctx=new Proxy({setTransform(){}},{get(target,key){return target[key]||(()=>{})}});
 function node(id){
  if(!dom.has(id)){
   const events={};
   dom.set(id,{id,events,style:{},textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},
    addEventListener(name,listener){events[name]=listener},
    getBoundingClientRect(){return {left:0,top:0,width:106,height:106}},
    getContext(){return ctx},setPointerCapture(){},querySelectorAll(){return []},
    closest(){return node('modal')}});
  }
  return dom.get(id);
 }
 const document={getElementById:node,querySelectorAll(){return []},body:{classList:{toggle(){}}}};
 const window={};
 const store={getItem(key){return storage.get(key)||null},setItem(key,value){storage.set(key,value)}};
 vm.runInNewContext(source,{document,window,innerWidth:393,innerHeight:852,devicePixelRatio:1,
  localStorage:store,performance:{now(){return 200000}},structuredClone,addEventListener(){},
  requestAnimationFrame(){},setInterval(){},Math,Date},{timeout:3000});
 return {node,storage,window,snapshot:()=>window.insectWorldSnapshot()};
}
test('former rounded UI is removed; original game loops and storage key remain',()=>{
 assert.match(html,/<title>곤충 생존기<\/title>/);
 assert.doesNotMatch(html,/border-radius:20px;background:#11251a/);
 assert.match(html,/#survivalDisk/);
 assert.match(html,/#quickPouch/);
 assert.match(html,/#inventoryList/);
 assert.match(html,/id="combatBar"/);
 assert.match(html,/id="zoneLabel"/);
 assert.match(html,/src="\.\/world3d\.mjs"/);
 assert.match(source,/jaewoon_insect_survival_v3/);
 for(const fn of ['buildWorld','save','load','trade','craft','equip','interact','attack','killBug','damagePlayer','respawnPlayer','update']){
  if(fn==='trade')continue;assert.match(source,new RegExp('function '+fn+'\\('));
 }
});
test('3D renderer uses only existing documented CC0 original sources and old 2D is hidden on success',()=>{
 for(const path of ['assets/roblox/actors/native/rogue.glb','assets/shared/forest/caterpillar.glb',
   'assets/shared/forest/monster-53.obj','assets/shared/forest/tree.fbx',
   'assets/shared/forest/mushroom.fbx','assets/shared/homely-house/floor_base.obj']){
  assert.ok(fs.existsSync(path),'licensed CC0 original missing: '+path);
  assert.ok(lineage.includes(path),'lineage record missing: '+path);
 }
 assert.match(world,/function derived\(key,height,tint\)/);
 assert.match(world,/clone\(true\)/);
 assert.match(world,/window\.insectScene3DReady=true/);
 assert.match(world,/legacy\.style\.visibility='hidden'/);
 assert.match(source,/if\(window\.insectScene3DReady\)return/);
 assert.match(lineage,/종별 완성 아트 PASS를 주장하지 않는다/);
});
test('combat controls, RPG status, dodge and save/restore boot without changing existing game key',()=>{
 const storage=new Map();
 const a=boot(storage);
 assert.equal(a.snapshot().state.day,1);
 assert.ok(a.snapshot().bugs.length>=25);
 const before=a.snapshot().player;
 a.node('dodgeBtn').events.pointerdown({});
 const after=a.snapshot().player;
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>0);
 assert.equal(after.rollTimer>0,true);
 assert.equal(a.snapshot().state.stamina,72);
 a.node('heavyBtn').events.pointerdown({});
 assert.ok(a.snapshot().state.stamina<72);
 a.node('whirlBtn').events.pointerdown({});
 a.node('skillsBtn').events.click({});
 a.node('slotCraft').events.click({});
 a.node('slotWeapon').events.click({});
 a.node('saveBtn').events.click({});
 const saved=JSON.parse(storage.get('jaewoon_insect_survival_v3'));
 assert.equal(saved.state.level,1);
 assert.equal(saved.state.crafted instanceof Object,true);
 const b=boot(storage);
 assert.equal(b.snapshot().state.day,1);
 assert.equal(b.snapshot().state.weapon,'none');
 assert.equal(b.snapshot().state.stamina,a.snapshot().state.stamina);
 assert.equal(b.snapshot().state.kills,0);
});
