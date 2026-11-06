// Real-world CC0 terrain geometry and visual grounding regression.
// Gameplay / damage / save state are intentionally outside this render-only fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';

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


test('runtime CC0 tile placement is exact: 12 non-overlapping panels with ground y=0',()=>{
  const bounds=objBounds(floor);
  const h=bounds.y.max-bounds.y.min;
  const normalize=.18/h;
  const makePosition=(x=0,y=0,z=0)=>({x,y,z,set(a,b,c){this.x=a;this.y=b;this.z=c}});
  const master={
    kind:'cc0-floor',userData:{},
    position:makePosition(0,-bounds.y.min*normalize,0),
    scale:{x:normalize,y:normalize,z:normalize},
    clone(){return {kind:this.kind,userData:{...this.userData},position:makePosition(this.position.x,this.position.y,this.position.z),
      scale:{...this.scale},clone:this.clone}}
  };
  const world={items:[],get children(){return this.items},add(value){this.items.push(value)}};
  const mockTHREE={
    Vector3:class{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}},
    Box3:class{
      setFromObject(){return this}
      getSize(vector){Object.assign(vector,{x:(bounds.x.max-bounds.x.min)*normalize,y:.18,
        z:(bounds.z.max-bounds.z.min)*normalize});return vector}
      getCenter(vector){Object.assign(vector,{x:(bounds.x.max+bounds.x.min)*normalize/2,y:.09,
        z:(bounds.z.max+bounds.z.min)*normalize/2});return vector}
      get max(){return {y:.18}}
    },
    PlaneGeometry:class{constructor(width,depth){Object.assign(this,{width,depth})}},
    MeshStandardMaterial:class{},
    Mesh:class{constructor(geometry,material){this.geometry=geometry;this.material=material;this.userData={};
      this.rotation={};this.position=makePosition()}}
  };
  const start=render.slice(render.indexOf('function environment(frame){'),render.indexOf(' const rand=i=>'));
  assert.ok(start.includes('const floor=derived('));
  const execute=new Function('THREE','world','model','ratio','GROUND_TILE_SPAN','GROUND_SURFACE_Y','window',
    'let fieldBuilt=false;const derived=()=>model;const batchGroundTiles=()=>false;'+start+
    String.fromCharCode(10)+'}'+String.fromCharCode(10)+'environment({world:{w:2200,h:1600}});return fieldBuilt;');
  const [ratio,surface,,pitch]=renderingConstants();
  assert.equal(execute(mockTHREE,world,master,ratio,pitch,surface,{}),true);
  const panels=world.items.filter(item=>item.kind==='cc0-floor');
  assert.equal(panels.length,12);
  assert.match(render,/batchGroundTiles\(floorTiles\)/,'GPU batching receives the 12 original CC0 tile instances');
  const centers=panels.map(p=>[p.position.x,p.position.y,p.position.z]);
  assert.equal(new Set(centers.map(v=>v.join(','))).size,12);
  for(const panel of panels){
    const width=panel.scale.x*(bounds.x.max-bounds.x.min);
    const depth=panel.scale.z*(bounds.z.max-bounds.z.min);
    assert.ok(Math.abs(width-pitch)<1e-8);
    assert.ok(Math.abs(depth-pitch)<1e-8);
    assert.ok(Math.abs(panel.position.y)<1e-8,'ground origin must be at Y=0');
    assert.ok(Math.abs((panel.position.x-pitch/2)/pitch-Math.round((panel.position.x-pitch/2)/pitch))<1e-8);
    assert.ok(Math.abs((panel.position.z-pitch/2)/pitch-Math.round((panel.position.z-pitch/2)/pitch))<1e-8);
  }
  assert.equal(world.items[0].geometry.width,56);
  assert.equal(world.items[0].geometry.depth,42);
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
  assert.match(render,/resources\[i\]\.position\.set\(node\.x\*ratio,GROUND_SURFACE_Y\+FOOT_CLEARANCE/);
  assert.match(game,/const SAVE_KEY='jaewoon_insect_survival_v3'/);
  assert.match(game,/window\.insectWorldSnapshot=/);
});

test('WebGL crash and context-loss recovery shows the original playable 2D canvas',()=>{
  assert.match(render,/webglcontextlost/);
  assert.match(render,/event\.preventDefault\(\)/);
  assert.match(render,/restoreLegacyView\('INSECT_CC0_3D_ASSET_FAILED',error\)/);
  assert.match(render,/restoreLegacyView\('INSECT_WEBGL_FRAME_FAILED',error\)/);
  const begin=render.indexOf('function restoreLegacyView(');
  const end=render.indexOf("renderer.domElement.addEventListener('webglcontextlost'");
  assert.ok(begin>=0&&end>begin,'original renderer must own WebGL failure recovery');
  const legacy={style:{visibility:'hidden'}};
  const webgl={style:{display:'block'},dataset:{renderedFrame:'true'}};
  const warns=[];
  const context={window:{insectScene3DReady:true},renderer:{domElement:webgl},
    document:{getElementById(id){return id==='cv'?legacy:null}},
    console:{warn(...args){warns.push(args)},error(...args){warns.push(args)}}};
  vm.runInNewContext('let worldReady=true;'+render.slice(begin,end)+
    ';restoreLegacyView("TEST_WEBGL_CONTEXT_LOST");globalThis.actualReady=worldReady;',context);
  assert.equal(context.actualReady,false);
  assert.equal(context.window.insectScene3DReady,false);
  assert.equal(legacy.style.visibility,'visible');
  assert.equal(webgl.style.display,'none');
  assert.equal(warns.length,1);
});

test('CC0 animated hero foot penetration is corrected after the original animation mixer',()=>{
  const begin=render.indexOf('function groundAnimatedHero(');
  const end=render.indexOf('function follow(frame,dt){');
  assert.ok(begin>=0&&end>begin,'animated visual grounding helper must exist');
  const code=render.slice(begin,end);
  const actor={
    position:{y:.035},
    userData:{},
    updates:0,
    updateMatrixWorld(){this.updates++}
  };
  const context={
    avatar:actor,GROUND_SURFACE_Y:0,FOOT_CLEARANCE:.035,
    heroGroundBounds:{
      setFromObject(target){this.min={y:target.position.y-.256};return this},
      isEmpty(){return false}
    }
  };
  vm.runInNewContext(code+';groundAnimatedHero();globalThis.firstLift=avatar.userData.visualGroundCorrection;',context);
  assert.ok(Math.abs(context.firstLift-.256)<1e-8,'22cm real browser penetration must be corrected');
  assert.ok(Math.abs(actor.position.y-(.035+.256))<1e-8);
  assert.equal(actor.updates,1);
  vm.runInNewContext(code+';groundAnimatedHero();globalThis.secondLift=avatar.userData.visualGroundCorrection;',context);
  assert.ok(context.secondLift<1e-7,'subsequent grounded frames must not drift upward');
  const follow=render.slice(render.indexOf('function follow(frame,dt){'),render.indexOf('function resize()'));
  assert.match(follow,/if\(heroMixer\)heroMixer\.update\(dt\);\s*groundAnimatedHero\(\);/,
    'ground correction must run after actual native CC0 animation');
  assert.match(render,/avatar\.position\.copy\(pos\)/,'gameplay player coordinates remain untouched');
});

test('native CC0 animations and fade transitions remain bound to the original clips',()=>{
  for(const name of ['Idle','Running_A','1H_Melee_Attack_Stab','2H_Melee_Attack_Spin','Dodge_Forward','Hit_A','Death_A']){
    assert.ok(render.includes(name),name+' clip missing');
  }
  assert.match(render,/\.fadeOut\(\.13\)/);
  assert.match(render,/\.fadeIn\(\.13\)/);
  assert.match(render,/heroMixer\.update\(dt\)/);
});

test('insect-specific Chromium smoke must prove live WebGL2 and aligned CC0 hero bounds',()=>{
  const script=fs.readFileSync(path.join(root,'qa/vibe2-development-web-browser-smoke.mjs'),'utf8');
  assert.match(render,/panel\.userData\.isGroundTile=true/);
  assert.match(render,/window\.insect3DGroundingProof=\(\)=>/);
  assert.match(render,/renderer\.domElement\.dataset\.renderedFrame='true'/);
  assert.match(script,/insect3dOnly=gameIds\.length===1&&gameIds\[0\]==='insect-survival'/);
  assert.match(script,/INSECT_CC0_TRUE_3D_GROUNDED_FRAME/);
  assert.match(script,/DEVELOPMENT_WEB_TRUE_3D_BROWSER_EVIDENCE_insect-survival=/);
  assert.match(script,/proof\?\.webgl2,true/);
  assert.match(script,/proof\?\.legacyHidden,true/);
  assert.match(script,/proof\?\.ground\?\.tileCount,12/);
  assert.match(script,/proof\.ground\.heroBottom>=proof\.ground\.floorTop-\.12/);
});

test('mobile browser smoke must check native touch dodge and animated CC0 ground contact',()=>{
 const script=fs.readFileSync(path.join(root,'qa/vibe2-development-web-browser-smoke.mjs'),'utf8');
 assert.match(script,/INSECT_EMULATED_MOBILE_GROUNDED_TOUCH/);
 assert.match(script,/Emulation\.setDeviceMetricsOverride/);
 assert.match(script,/Emulation\.setTouchEmulationEnabled/);
 assert.match(script,/DEVELOPMENT_WEB_MOBILE_EMULATION_EVIDENCE_insect-survival/);
 assert.match(script,/DEVELOPMENT_WEB_MOBILE_TOUCH_EVIDENCE_insect-survival/);
 assert.match(script,/Input\.dispatchTouchEvent/);
 assert.match(script,/mobileProof\.ground\.heroBottom>=-\.12/);
 assert.match(script,/touchResult\?\.serial>mobileProof\.serial/);
 assert.match(script,/touchResult\?\.grounded,true/);
});
