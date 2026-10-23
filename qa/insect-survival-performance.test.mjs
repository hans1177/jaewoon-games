// Game presentation frame pressure uses measured WebGL evidence, not inferred platform FPS.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {diagnoseVibeWebFrameBottleneck} from '../tools/vibe2-performance-sanity.mjs';

const source=fs.readFileSync(new URL('../web-games/insect-survival/world3d.mjs',import.meta.url),'utf8');
const smoke=fs.readFileSync(new URL('./vibe2-development-web-browser-smoke.mjs',import.meta.url),'utf8');
const frameProof=(extra={})=>({
 kind:'VIBE_WEB_RUNTIME_FRAME_EVIDENCE',ready:true,activeWebGL:true,rendererVisible:true,
 frameSampleValid:true,framesObserved:90,averageFrameMs:26,latestFrameMs:28,
 pixelRatio:1.15,pixelRatioCap:1.3,pixelRatioFloor:.8,resolutionAdjustments:1,
 renderCalls:45,triangles:10000,hardwareBenchmarkVerified:false,...extra
});

test('actual mobile WebGL frames adjust only presentation DPR with hysteresis',()=>{
 const start=source.indexOf('const perfBudget={');
 const end=source.indexOf('renderer.setSize(',start);
 assert.ok(start>=0&&end>start,'quality tuner is owned by the game renderer');
 const code=source.slice(start,end);
 const renderer={ratios:[],setPixelRatio(value){this.ratios.push(value)}};
 const context=vm.createContext({renderer,devicePixelRatio:2.5,mobile:true,document:{hidden:false}});
 vm.runInContext(code,context);
 vm.runInContext('for(let i=1;i<=90;i++)sampleWebFrameBudget(i*28);',context);
 assert.ok(renderer.ratios.some(value=>value<1.3&&value>=.8),
   'low frame pacing should reduce WebGL-only resolution');
 const reduced=renderer.ratios.at(-1);
 vm.runInContext('for(let i=1;i<=180;i++)sampleWebFrameBudget(90*28+i*15);',context);
 assert.ok(renderer.ratios.at(-1)>=reduced,'healthy pacing may restore only up to cap');
 assert.ok(renderer.ratios.at(-1)<=1.3);
 assert.match(source,/renderer\.setPixelRatio\(next\)/);
 assert.match(source,/if\(frame&&!document\.hidden\)/,'invisible page must not render');
 assert.doesNotMatch(code,/localStorage|player\.hp|player\.x|state\.inventory/,
   'presentation tuning must not modify gameplay or persistence');
});

test('Vibe derives observed bottlenecks without fabricated hardware certification',()=>{
 const slow=diagnoseVibeWebFrameBottleneck(frameProof({renderCalls:220}));
 assert.equal(slow.observed,true);
 assert.equal(slow.frameIntervalMeasured,true);
 assert.equal(slow.advisoryOnly,true);
 assert.equal(slow.sourceWrite,false);
 assert.equal(slow.evidence.hardwareBenchmarkVerified,false);
 assert.ok(slow.bottlenecks.includes('FRAME_BUDGET_PRESSURE'));
 assert.ok(slow.bottlenecks.includes('DRAW_CALL_PRESSURE'));
 assert.ok(slow.bottlenecks.includes('RESOLUTION_AUTO_REDUCED'));
 const fast=diagnoseVibeWebFrameBottleneck(frameProof({pixelRatio:1.3,averageFrameMs:15,renderCalls:45}));
 assert.equal(fast.observed,true);
 assert.deepEqual(fast.bottlenecks,[]);
 const noProof=diagnoseVibeWebFrameBottleneck({frameSampleValid:true,framesObserved:999,averageFrameMs:8});
 assert.equal(noProof.observed,false);
 assert.ok(noProof.bottlenecks.includes('NO_VERIFIED_WEBGL_FRAME_TELEMETRY'));
 const few=diagnoseVibeWebFrameBottleneck(frameProof({framesObserved:3,frameSampleValid:false}));
 assert.equal(few.observed,true);
 assert.equal(few.frameIntervalMeasured,false);
 assert.ok(few.bottlenecks.includes('INSUFFICIENT_FRAME_SAMPLES'));
 const batched=diagnoseVibeWebFrameBottleneck(frameProof({
  decorGpuBatches:2,decorGpuInstances:45,decorGpuProps:39
 }));
 assert.equal(batched.evidence.decorGpuBatches,2);
 assert.equal(batched.evidence.decorGpuInstances,45);
 assert.equal(batched.evidence.decorGpuProps,39);
 assert.equal(batched.evidence.hardwareBenchmarkVerified,false);
 const invalid=diagnoseVibeWebFrameBottleneck(frameProof({
  decorGpuBatches:2,decorGpuInstances:1,decorGpuProps:50
 }));
 assert.equal(invalid.evidence.decorGpuBatches,null,'impossible Vibe counters must not be certified');
});

test('existing Chromium smoke connects raw game performance evidence to Vibe only',()=>{
 assert.match(smoke,/insect3DPerformanceProof/);
 assert.match(smoke,/diagnoseVibeWebFrameBottleneck\(frameBudget\)/);
 assert.match(smoke,/DEVELOPMENT_WEB_VIBE_BOTTLENECK_DIAGNOSIS_insect-survival/);
 assert.match(smoke,/DEVELOPMENT_WEB_MOBILE_VIBE_PERFORMANCE_EVIDENCE_insect-survival/);
 assert.match(smoke,/hardwareBenchmarkVerified,false/);
 assert.match(source,/window\.insect3DPerformanceProof/);
 assert.match(source,/performance\.now\(\)/);
 assert.match(source,/perfBudget\.renderCalls=renderer\.info\.render\.calls/);
 assert.match(source,/renderer\.domElement\.dataset\.renderedFrame='true'/);
 assert.match(source,/groundAnimatedHero\(\)/);
 assert.match(source,/renderer\.render\(scene,camera\)/);
});

test('resource CC0 pooling reuses existing meshes and only rebuilds changed source roles',()=>{
 const start=source.indexOf('function syncResourceVisual(index,node){');
 const end=source.indexOf('// 액션 모션:',start);
 assert.ok(start>=0&&end>start,'real CC0 reconciliation helper required');
 const data=source.slice(start,end);
 const resources=[],attached=[];
 let derivations=0;
 class Group{
  constructor(){this.children=[];this.userData={}}
  add(child){this.children.push(child)}
  clear(){this.children=[]}
 }
 const context=vm.createContext({
  resources,actors:{add(group){attached.push(group)}},
  resourceVisualRebuilds:0,THREE:{Group},
  derived:(type,height,tint)=>({type,height,tint,id:++derivations})
 });
 vm.runInContext(data,context);
 vm.runInContext("syncResourceVisual(0,{type:'fiber'})",context);
 const first=resources[0].children[0];
 vm.runInContext("syncResourceVisual(0,{type:'fiber'})",context);
 assert.strictEqual(resources[0].children[0],first,'unchanged visual source must retain mesh identity');
 assert.equal(derivations,1);
 vm.runInContext("syncResourceVisual(0,{type:'pebble'})",context);
 assert.equal(derivations,2,'different source roles must remap correctly');
 assert.equal(resources[0].children[0].type,'stone');
 assert.equal(attached.length,1,'role changes must not duplicate scene groups');
 assert.match(source,/while\(resources\.length>frame\.nodes\.length\)/);
 assert.doesNotMatch(source,/while\(resources\.length\)\{const old=resources\.pop\(\)/,
  'resource count changes must not rebuild all CC0 visuals');
});

test('fog decor culling affects distant graphics only and keeps the game world intact',()=>{
 const start=source.indexOf('function refreshDecorVisibility(');
 const end=source.indexOf('function actorsFromFrame(',start);
 assert.ok(start>=0&&end>start,'in-place cosmetic culling required');
 const code=source.slice(start,end);
 const make=(x,range)=>({position:{x,z:0},userData:{visualRange:range},visible:true});
 const near=make(0,25),far=make(70,25);
 const decor={children:[near,far]};
 const context=vm.createContext({decor,decorVisibilityTick:0});
 vm.runInContext(code,context);
 vm.runInContext('refreshDecorVisibility(0,0,true)',context);
 assert.equal(near.visible,true);
 assert.equal(far.visible,false);
 vm.runInContext('refreshDecorVisibility(70,0,true)',context);
 assert.equal(near.visible,false);
 assert.equal(far.visible,true);
 // Hysteresis: hidden decoration needs to get inside range - 4 to reappear.
 vm.runInContext('refreshDecorVisibility(45,0,true)',context);
 assert.equal(near.visible,false,'out-of-range prop stays hidden in hysteresis band');
 assert.equal(far.visible,true,'visible prop stays visible in hysteresis band');
 assert.match(source,/refreshDecorVisibility\(frame\.player\.x\*ratio,frame\.player\.y\*ratio,true\)/);
 assert.match(source,/refreshDecorVisibility\(pos\.x,pos\.z\)/);
 assert.match(source,/visibleDecor:decor\.children\.filter/);
 assert.doesNotMatch(code,/enemies|resources|world\.children|state\.|player\.hp|SAVE_KEY/);
});

test('CC0 floor GPU instancing must preserve all 12 original meshes and their world transforms',()=>{
 const start=source.indexOf('function batchGroundTiles('),end=source.indexOf('function environment(frame){',start);
 assert.ok(start>=0&&end>start,'GPU batching implementation required');
 const code=source.slice(start,end);
 const tiles=Array.from({length:12},(_,i)=>({
  visible:true,
  updateMatrixWorld(){this.updated=true},
  traverse(cb){
   cb({isMesh:true,geometry:{name:'CC0_FLOOR_A'},material:{name:'CC0_A'},matrixWorld:{id:'a'+i}});
   cb({isMesh:true,geometry:{name:'CC0_FLOOR_B'},material:{name:'CC0_B'},matrixWorld:{id:'b'+i}});
  }
 }));
 const batches=[];
 class InstancedMesh{
  constructor(geometry,material,count){
   this.geometry=geometry;this.material=material;this.count=count;this.userData={};
   this.instanceMatrix={needsUpdate:false};this.transforms=[];this.visible=true;
  }
  setMatrixAt(index,value){this.transforms[index]=value}
 }
 const world={add(item){batches.push(item)}};
 const context=vm.createContext({THREE:{InstancedMesh},world,console:{warn(){}},tiles});
 vm.runInContext('let floorGpuMeshes=[],floorGpuInstances=0;'+code+
   ';globalThis.batched=batchGroundTiles(tiles);globalThis.count=floorGpuInstances;'+
   'globalThis.batchList=floorGpuMeshes;',context);
 assert.equal(context.batched,true);
 assert.equal(context.count,12);
 assert.equal(batches.length,2,'one draw-call source per original CC0 submesh, not per tile');
 assert.ok(tiles.every(tile=>tile.updated&&tile.visible===false));
 assert.ok(batches.every(group=>group.count===12&&group.instanceMatrix.needsUpdate===true));
 assert.equal(batches[0].transforms[11].id,'a11');
 assert.equal(batches[1].transforms[7].id,'b7');
 assert.ok(batches.every(mesh=>mesh.userData.cc0FloorInstance===true));
 assert.match(source,/window\.insect3DGroundingProof=\(\)=>/);
 assert.match(source,/floorGpuVisible:/);
 const fallbackTiles=[{visible:true}];
 const missing=vm.createContext({THREE:{},world,console:{warn(){}},tiles:fallbackTiles});
 vm.runInContext(code+';globalThis.batched=batchGroundTiles(tiles);',missing);
 assert.equal(missing.batched,false,'missing InstancedMesh keeps original CC0 tiles');
 assert.equal(fallbackTiles[0].visible,true);
});

test('real Chromium WebGL QA requires instanced 12-tile ground, no fake draw-call passing',()=>{
 assert.match(smoke,/floorGpuInstances,12/);
 assert.match(smoke,/floorGpuVisible,true/);
 assert.match(smoke,/floorGpuBatches/);
 assert.match(source,/batchGroundTiles\(floorTiles\)/);
 assert.match(source,/const floorTop=first\?new THREE\.Box3\(\)\.setFromObject\(first\)\.max\.y:null/);
});

test('repeated static CC0 decor meshes batch without altering models or fog visibility',()=>{
 const start=source.indexOf('function batchStaticDecor(');
 const end=source.indexOf('// Fog-distance render culling',start);
 const visStart=source.indexOf('function refreshDecorVisibility(');
 const visEnd=source.indexOf('function actorsFromFrame(',visStart);
 assert.ok(start>0&&end>start&&visStart>end&&visEnd>visStart);
 const sharedGeometry={id:'original-CC0-geometry'},sharedMaterial={id:'derived-tint'};
 const uniqueMaterial={id:'different-tint'};
 const make=(x,material)=>{
  const mesh={isMesh:true,isSkinnedMesh:false,geometry:sharedGeometry,material,
   matrixWorld:{x},visible:true};
  return {visible:true,userData:{visualRange:30},position:{x,z:0},
   updateMatrixWorld(){},traverse(fn){fn(mesh)},sourceMesh:mesh};
 };
 const p1=make(0,sharedMaterial),p2=make(12,sharedMaterial),p3=make(75,sharedMaterial),
   unique=make(80,uniqueMaterial);
 class InstancedMesh{
  constructor(geometry,material,count){Object.assign(this,{geometry,material,count,userData:{},
   visible:true,instanceMatrix:{needsUpdate:false},transforms:[]});}
  setMatrixAt(index,matrix){this.transforms[index]=matrix;}
 }
 const created=[];
 const hidden={hidden:true};
 const ctx=vm.createContext({
  THREE:{InstancedMesh},decor:{children:[p1,p2,p3,unique]},scene:{add(mesh){created.push(mesh)}},
  console:{warn(){throw Error('Valid CC0 instances must not fail')}},
  hiddenDecorTransform:hidden
 });
 vm.runInContext('let decorGpuBatches=0,decorGpuInstances=0,decorGpuProps=0,decorVisibilityTick=0;'+
  source.slice(start,end)+source.slice(visStart,visEnd)+
  ';globalThis.batch=batchStaticDecor;globalThis.cull=refreshDecorVisibility;'+
  'globalThis.metrics=()=>({batches:decorGpuBatches,instances:decorGpuInstances,props:decorGpuProps})',ctx);
 ctx.batch();
 assert.equal(created.length,1,'identical source geometry/material must share one GPU draw');
 assert.equal(created[0].count,3,'all matching decorative props must keep their own transform');
 assert.deepEqual([...created[0].transforms.map(x=>x.x)],[0,12,75]);
 assert.equal(ctx.metrics().batches,1);
 assert.equal(ctx.metrics().instances,3);
 assert.equal(ctx.metrics().props,3);
 assert.ok([p1,p2,p3].every(p=>p.visible===false&&p.userData.decorBatchSlots?.length===1));
 assert.equal(unique.visible,true,'different original-tint must remain independent');
 assert.strictEqual(p1.sourceMesh.geometry,sharedGeometry,'original geometry stays immutable');
 ctx.cull(0,0,true);
 assert.strictEqual(created[0].transforms[2],hidden,
  'distant instance must not be drawn even while batch is visible');
 assert.ok(p1.userData.rangeVisible);
 assert.equal(unique.visible,false,'unbatched unique prop still uses normal fog culling');
 ctx.cull(75,0,true);
 assert.equal(created[0].transforms[2].x,75,'nearby instance must be restored in-place');
 assert.strictEqual(created[0].transforms[0],hidden);
 assert.equal(created[0].instanceMatrix.needsUpdate,true);
 const noInstanceProps=[make(0,sharedMaterial),make(6,sharedMaterial)];
 const fallback=vm.createContext({
  THREE:{},decor:{children:noInstanceProps},scene:{add(){throw Error('no GPU batch expected')}},
  console:{warn(){}},hiddenDecorTransform:hidden
 });
 vm.runInContext('let decorGpuBatches=0,decorGpuInstances=0,decorGpuProps=0;'+
  source.slice(start,end)+';globalThis.batch=batchStaticDecor;',fallback);
 fallback.batch();
 assert.ok(noInstanceProps.every(p=>p.visible===true),
  'unsupported renderer must preserve original CC0 decor visibility');
 assert.doesNotMatch(source.slice(start,end),/state\.hp|player\.x|save\(|enemies\.push|resources\.push/);
});

test('real Chromium and Vibe inspect decorative instancing without hardware FPS claims',()=>{
 assert.match(smoke,/decorGpuBatches/);
 assert.match(smoke,/decorGpuInstances/);
 assert.match(source,/batchStaticDecor\(\)/);
 assert.match(source,/decorGpuBatches,decorGpuInstances,decorGpuProps/);
 assert.match(source,/visibleDecor:decor\.children\.filter/);
});

test('resource instancing uploads only on changed node data and restores safe CC0 fallback',()=>{
 const start=source.indexOf('function syncResourceGpuInstances(nodes){');
 const end=source.indexOf('// Resource pooling is visual-only',start);
 assert.ok(start>=0&&end>start,'authoritative pickup presentation batching required');
 const snippet=source.slice(start,end);
 let uploads=0;
 class InstancedMesh{
  constructor(geometry,material,capacity){
   this.geometry=geometry;this.material=material;this.count=capacity;this.visible=true;
   this.instanceMatrix={count:capacity,needsUpdate:false};
   this.userData={};this.matrices=[];
  }
  setMatrixAt(i,matrix){this.matrices[i]={...matrix};uploads++}
  dispose(){this.disposed=true}
 }
 const geometry={uuid:'shared-cc0-foliage'},material={uuid:'cc0-fiber'};
 const group=(x)=>({
  position:{x,z:0},visible:true,
  mesh:{isMesh:true,geometry,material,matrixWorld:{x}},
  updateMatrixWorld(){this.mesh.matrixWorld={x:this.position.x,z:this.position.z}},
  traverse(cb){cb(this.mesh)}
 });
 const resources=[group(1),group(2),group(3)],attached=[];
 const context=vm.createContext({
  THREE:{InstancedMesh},resourceGpuMeshes:new Map(),resourceGpuModels:0,
  resourceGpuUpdates:0,resourceGpuRevision:'',resources,
  actors:{add(value){attached.push(value)},remove(value){const i=attached.indexOf(value);if(i>=0)attached.splice(i,1)}},
  console:{warn(){}}
 });
 vm.runInContext(snippet,context);
 const state="[{type:'fiber',x:1,y:0},{type:'fiber',x:2,y:0},{type:'fiber',x:3,y:0}]";
 vm.runInContext('syncResourceGpuInstances('+state+')',context);
 assert.equal(context.resourceGpuMeshes.size,1);
 assert.equal(context.resourceGpuModels,3);
 assert.equal(uploads,3);
 assert.ok(resources.every(item=>item.visible===false),'source CC0 groups cannot draw twice');
 vm.runInContext('syncResourceGpuInstances('+state+')',context);
 assert.equal(uploads,3,'unchanged resources must not upload GPU matrices every frame');
 resources[2].position.x=5;
 vm.runInContext("syncResourceGpuInstances([{type:'fiber',x:1,y:0},{type:'fiber',x:2,y:0},{type:'fiber',x:5,y:0}])",context);
 assert.equal(uploads,6,'changed source data must update every instance');
 assert.equal(context.resourceGpuUpdates,2);
 resources[0].mesh.material=[]; // unsupported CC0 hierarchy cannot be force-instanced
 vm.runInContext("syncResourceGpuInstances([{type:'fiber',x:9,y:0}])",context);
 assert.ok(resources.every(item=>item.visible===true),'batch failure restores original visible CC0 resources');
 assert.ok([...context.resourceGpuMeshes.values()].every(batch=>batch.visible===false));
 assert.match(source,/syncResourceGpuInstances\(frame\.nodes\)/);
 assert.match(source,/resourceGpuBatches:resourceGpuMeshes\.size/);
 assert.doesNotMatch(snippet,/state\.inventory|player\.hp|localStorage|SAVE_KEY/);
});

test('Vibe diagnosis records resource GPU batches without claiming physical GPU benchmark',()=>{
 const performance=frameProof({resourceGpuBatches:3,resourceGpuModels:70,resourceGpuUpdates:1});
 const diagnosis=diagnoseVibeWebFrameBottleneck(performance);
 assert.equal(diagnosis.evidence.resourceGpuBatches,3);
 assert.equal(diagnosis.evidence.resourceGpuModels,70);
 assert.equal(diagnosis.evidence.resourceGpuUpdates,1);
 assert.equal(diagnosis.evidence.hardwareBenchmarkVerified,false);
 const invalid=diagnoseVibeWebFrameBottleneck({...performance,resourceGpuModels:-9});
 assert.equal(invalid.evidence.resourceGpuModels,null);
});
