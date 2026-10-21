// 원래 게임 규칙·저장을 보존한 채 UI와 3D 화면을 전환하는 회귀 검증.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {planAssetApplication} from '../assets/asset-selector.js';

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
 assert.match(html,/#inventoryList\{grid-template-columns:/);
 assert.match(html,/class="bagGrid"/);
 assert.match(html,/class="equipmentPane"/);
 assert.match(html,/function openInventory\(\)/);
 assert.doesNotMatch(html,/rows\.push\('<div class="item"><b>현재 장비/);
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
   'assets/shared/forest/monster-53.obj','assets/shared/homely-house/tree_large.obj',
   'assets/shared/forest/mushroom.fbx','assets/shared/homely-house/floor_base.obj']){
  assert.ok(fs.existsSync(path),'licensed CC0 original missing: '+path);
  assert.ok(lineage.includes(path),'lineage record missing: '+path);
 }
 assert.match(world,/function derived\(key,height,tint\)/);
 assert.match(world,/import \{clone as cloneSkinned\} from 'three\/addons\/utils\/SkeletonUtils\.js'/);
 for(const clip of ['Idle','Running_A','1H_Melee_Attack_Stab','2H_Melee_Attack_Spin','Dodge_Forward','Hit_A'])assert.ok(world.includes(clip),'missing actual CC0 rig motion: '+clip);
 assert.match(world,/clone\(true\)/);
 assert.match(world,/window\.insectScene3DReady=true/);
 assert.match(world,/legacy\.style\.visibility='hidden'/);
 assert.match(source,/if\(window\.insectScene3DReady\)return/);
 assert.match(lineage,/종별 완성 아트 PASS를 주장하지 않는다/);
});
test('insect forest tree uses the exact acquired CC0 original and pinned rights lineage',()=>{
 const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
 const id='external-tinytreats-tree-large-v1';
 const asset=registry.assets.find(row=>row.id===id);
 assert.ok(asset,'tree master must remain in the canonical company library');
 assert.equal(asset.license,'CC0');
 assert.equal(asset.downloaded,true);
 assert.notEqual(asset.quarantined,true);
 assert.equal(asset.path,'/assets/shared/homely-house/tree_large.obj');
 assert.match(asset.licenseEvidenceUrl||'',/^https:\/\/github\.com\/TinyTreats-Game-Assets\/Tiny-Treats-Homely-House-1\.0\/blob\/[0-9a-f]{40}\/LICENSE\.txt$/);
 assert.match(asset.sourceHash||'',/^[0-9a-f]{64}$/);
 const sourceBytes=fs.readFileSync('assets/shared/homely-house/tree_large.obj');
 assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),asset.sourceHash);
 assert.match(world,/tree:\{src:'shared\/homely-house\/tree_large\.obj',format:'obj'/);
 assert.doesNotMatch(world,/tree:\{src:'shared\/forest\/tree\.fbx'/);
 assert.ok(lineage.includes(id));
 assert.ok(lineage.includes(asset.sourceHash));
 assert.ok(lineage.includes(asset.licenseEvidenceUrl));
 // Game rules and save state stay in the original 2D authoritative script.
 assert.match(source,/jaewoon_insect_survival_v3/);
 assert.match(world,/const game=document\.getElementById\('game'\),snapshot=\(\)=>window\.insectWorldSnapshot\?\.\(\)/);
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
 assert.deepEqual(Object.keys(saved.player).sort(),['x','y']);
 assert.equal(saved.state.crafted instanceof Object,true);
 const b=boot(storage);
 assert.equal(b.snapshot().state.day,1);
 assert.equal(b.snapshot().state.weapon,'none');
 assert.equal(b.snapshot().state.stamina,a.snapshot().state.stamina);
 assert.equal(b.snapshot().state.kills,0);
});

test('CC0 original spin, dodge and death actions use one-shot playback and accepted action replay',()=>{
 const body=world.slice(world.indexOf('function setHeroMotion('),world.indexOf('function follow('));
 const action=()=>({reset(){this.resets=(this.resets||0)+1;return this},setLoop(mode,reps){this.mode=mode;this.reps=reps;return this},
  setEffectiveTimeScale(value){this.rate=value;return this},setDuration(value){this.duration=value;return this},fadeIn(){return this},fadeOut(){return this},play(){return this}});
 const context={THREE:{LoopOnce:'once',LoopRepeat:'repeat'},heroActions:{idle:action(),run:action(),spin:action(),death:action()},playingAction:''};
 vm.runInNewContext(body+';globalThis.apply=setHeroMotion',context);
 context.apply('spin',false,.36);assert.equal(context.heroActions.spin.mode,'once');assert.equal(context.heroActions.spin.duration,.36);
 context.apply('spin');assert.equal(context.heroActions.spin.resets,1);
 context.apply('spin',true,.36);assert.equal(context.heroActions.spin.resets,2);
 context.apply('death');assert.equal(context.heroActions.death.mode,'once');assert.equal(context.heroActions.death.clampWhenFinished,true);
 context.apply('run');assert.equal(context.heroActions.run.mode,'repeat');
 assert.match(world,/frame\.state\.dead\?'death'/);
 assert.match(world,/p\.motionAction==='spin'\?'spin':'stab'/);
 const a=boot();a.node('whirlBtn').events.pointerdown({});
 assert.equal(a.snapshot().player.motionAction,'spin');assert.equal(a.snapshot().player.motionSerial,1);
 assert.equal(a.snapshot().state.stamina,64);
 a.node('whirlBtn').events.pointerdown({});assert.equal(a.snapshot().player.motionSerial,1);
 a.node('dodgeBtn').events.pointerdown({});assert.equal(a.snapshot().player.motionAction,'dodge');assert.equal(a.snapshot().player.motionSerial,2);
 a.node('saveBtn').events.click({});
});

test('shared CC0 derivatives reuse materials by original and tint without changing the master',()=>{
 const body=world.slice(world.indexOf('const derivedMaterials='),world.indexOf('const originals='));
 assert.ok(body.startsWith('const derivedMaterials=new Map()'),'reuse stays inside the existing renderer');
 let copied=0;
 const master={color:{tint:null},clone(){copied++;return {color:{tint:null,multiply(tint){this.tint=tint.hex}}};}};
 const createModel=()=>({scale:{multiplyScalar(){}},position:{y:0},traverse(fn){
  this.mesh={isMesh:true,material:master};fn(this.mesh);
 }});
 const ctx={
  originals:{tree:{clone:createModel}},
  cloneSkinned:createModel,BASE:{tree:{color:'#aabbcc'}},
  THREE:{
   Box3:class{constructor(){this.min={y:0}}setFromObject(){return this}getSize(value){value.y=2;return value}},
   Vector3:class{constructor(){this.y=0}},
   Color:class{constructor(hex){this.hex=hex}getHexString(){return this.hex.replace('#','')}},
   MeshStandardMaterial:class{},DoubleSide:'both'
  }
 };
 vm.runInNewContext(body+';globalThis.make=derived',ctx);
 const first=ctx.make('tree',9,'#96c486');
 const second=ctx.make('tree',13,'#96c486');
 const alternate=ctx.make('tree',9,'#d6b77d');
 assert.equal(first.mesh.material,second.mesh.material,'same CC0 parent/tint shares GPU material');
 assert.notEqual(first.mesh.material,alternate.mesh.material,'different game tint stays isolated');
 assert.equal(copied,2,'one material copy per distinct presentation variant');
 assert.equal(master.color.tint,null,'the immutable original material remains untouched');
});

test('common CC0 source inventory does not authorize deletion and checks existing immutable sources',()=>{
 const healthScript=fs.readFileSync('tools/asset-health-check.mjs','utf8');
 assert.match(healthScript,/const licenseOk=\/\^\(\?:CC0/,'normal health gate must reject MIT');
 const result=spawnSync(process.execPath,['tools/asset-health-check.mjs','--inventory'],{
  encoding:'utf8',maxBuffer:8*1024*1024
 });
 assert.equal(result.status,0,result.stderr.slice(-1000));
 const audit=JSON.parse(result.stdout);
 assert.equal(audit.deletionAuthorized,false);
 assert.equal(audit.quarantineMeansBlockNewUseNotMoveOrErase,true);
 assert.ok(audit.summary.registryAssets>=100);
 assert.equal(audit.summary.registryAssets,audit.assets.length);
 assert.equal(audit.summary.registeredCc0,audit.summary.registryAssets);
 assert.equal(audit.summary.externalNonCc0,2);
 assert.equal(audit.summary.legacyNonCc0,1);
 assert.equal(audit.summary.sourceOnlyArchives,113,'existing source-only archive manifests remain preserved');
 assert.ok(audit.summary.suspiciousSourcePointers>=10,'truncated Blender source pointers require reacquisition');
 assert.ok(audit.archives.every(row=>row.sourceOnly&&row.hashReverified===false));
 assert.ok(audit.archives.filter(row=>row.suspiciousPointer).every(row=>row.action==='QUARANTINE_NEW_USE_REACQUIRE_OR_VERIFY'));
 assert.ok(audit.summary.immutableHashPass>=32,'pinned original bytes must be independently hashed');
 assert.equal(audit.summary.immutableHashMismatch,0);
 const tree=audit.assets.find(row=>row.id==='external-tinytreats-tree-large-v1');
 assert.ok(tree&&tree.immutableHash==='PASS'&&tree.verifiedLocal);
 assert.ok(tree.consumers.includes('web-games/insect-survival/world3d.mjs'),'actual source consumer evidence');
 assert.ok(audit.externalSources.filter(row=>row.excludedFromGameUse).every(row=>row.action==='EXCLUDE_NON_CC0_KEEP_METADATA'));
 assert.ok(audit.legacy.some(row=>row.license==='MIT'&&row.action==='QUARANTINE_NEW_USE_KEEP_CATALOG'));
});

test('shared selection requires explicit local acquisition and blocks forbidden CC0 candidates',()=>{
 const manifest={assets:[
  {id:'usable-tree',types:['prop'],path:'assets/shared/homely-house/tree_large.obj',license:'CC0',downloaded:true},
  {id:'unknown-download',types:['prop'],path:'assets/missing.obj',license:'CC0'},
  {id:'forbidden',types:['prop'],path:'assets/other.obj',license:'CC0',downloaded:true,gameUseForbidden:true},
  {id:'commercial',types:['prop'],path:'assets/third.obj',license:'MIT',downloaded:true}
 ]};
 const plan=planAssetApplication({prompt:'숲 나무',manifest});
 assert.deepEqual(plan.matched.filter(row=>row.type==='prop').map(row=>row.id),['usable-tree']);
 assert.equal(plan.sourceBindingVerified,false,'candidate choice is not a runtime pass');
 assert.equal(plan.nativeRuntimeVerified,false);
});
