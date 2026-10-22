// Existing Cat Frontline simulation: native perspective WebGL view never owns combat or saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('web-games/line-defense/index.html','utf8');
const native=fs.readFileSync('web-games/line-defense/frontline3d.mjs','utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('cat frontline renders with actual native 3D camera and visible collision-bound actors',()=>{
  assert.ok(source,'gameplay module exists');
  assert.match(html,/data-render-target="webgl-3d"/);
  assert.match(source,/import \{createFrontline3d\} from '\.\/frontline3d\.mjs'/);
  assert.match(html,/"three":"\.\.\/\.\.\/assets\/roblox\/world-ghosts\/native\/mesh\/three\/three\.module\.js"/);
  assert.ok(fs.existsSync('assets/roblox/world-ghosts/native/mesh/three/three.module.js'));
  assert.doesNotMatch(source,/\bgetContext\s*\(\s*['"]2d['"]/);
  assert.doesNotMatch(source,/\bX\./);
  for(const marker of [
    'new THREE.WebGLRenderer(', 'new THREE.PerspectiveCamera(', 'renderer.render(scene,camera)',
    "canvas.dataset.renderedFrame='true'", "document.body.dataset.renderer='three-webgl'",
    "canvas.dataset.unrenderedActors='0'", 'new THREE.DirectionalLight(',
    "const actuallyMoving=moved>.00012;", 'actuallyMoving?Math.sin(time*.021+f.uid)',
    "document.body.dataset.nativeArtCoverage='incomplete'", 'webglcontextlost'
  ])assert.ok(native.includes(marker),marker);
  assert.match(native,/scene\.remove\(record\.group\);actors\.delete\(id\)/);
  assert.match(source,/frontline3d\.render\(\{state:s\},performance\.now\(\)\)/);
  // A comment may name saved gameplay data; only executing persistence access is forbidden here.
  assert.doesNotMatch(native,/\blocalStorage\s*(?:\.|\[)|\.hp\s*[-+]?=|\.money\s*[-+]?=|save\.gold\s*[-+]?=/);
});

test('original ten-stage combat, 13 ally/7 enemy definitions, gacha and original save key survive',()=>{
 for(const marker of [
  "KEY='jaewoon-line-defense-v1'",'const MAX_SQUAD=6',
  "blob:{name:'꼬마 고양이',icon:'●',cost:60,hp:85,atk:11",
  "shield:{name:'방패 고양이',icon:'▣',cost:120,hp:280",
  "hammer:{name:'망치 고양이',icon:'⬟',cost:300,hp:260,atk:72",
  "mage:{name:'마법 고양이',icon:'✹',cost:390,hp:110,atk:56",
  "legend:{name:'전설 고양이',icon:'★',cost:650,hp:360,atk:160",
  "seaWolf:{name:'바다 늑대',hp:1500,atk:65",
  "boss:{name:'바위왕',hp:1350,atk:58",
  'if(s.stage===7)', 'if(s.stage===10)', 'if(s.stage===6)',
  "if(s.stage===8)","if(s.stage===9)",
  "v.stage=clamp(Number(v.stage)||1,1,10)",
  "const h=castleMax(),stage=save.stage",
  "return 1200+save.castleLv*200",
  'return 28', 'const attackScale=b.attackScale??1.8',
  's.money-=u.cost;s.cools[k]=u.cool',
  'o.hp-=a.atk;o.flash=.16', 'function team(group,foes,side,dt)',
  'const cost=walletUpgradeCost()', 'Math.pow(1.65,s.walletLv-1)',
  'function finish(win)', 'function persist()'
 ])assert.ok(source.includes(marker),marker);
 for(const kind of ['blob','shield','spear','ranger','rush','blade','hammer','knight','mage','giant','wall','iron','legend'])
  assert.match(native,new RegExp("'"+kind+"'"));
 for(const kind of ['mouse','rabbit','mole','boar','goose','seaWolf','boss'])
  assert.match(native,new RegExp("'"+kind+"'"));
});

function harness(){
 const nodes=new Map(),listeners=new Map();let frame=null,lastRendered=null;
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const handlers=new Map(),classes=new Set(),children=[];
  const result={id,style:{},dataset:{},hidden:false,disabled:false,className:'',textContent:'',innerHTML:'',
   children,classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),
    contains:n=>classes.has(n),toggle:(n,v)=>v?classes.add(n):classes.delete(n)},
   addEventListener:(n,fn)=>handlers.set(n,fn),
   dispatch(n,event={}){return handlers.get(n)?.(event)},
   appendChild(child){children.push(child)},
   querySelector(selector){return node('selector-'+selector)},
   querySelectorAll(selector){return []},
   getContext(){throw Error('Canvas2D forbidden')}};
  nodes.set(id,result);return result;
 }
 const document={body:{dataset:{}},getElementById:node,
  createElement:tag=>node('created-'+tag+'-'+nodes.size),
  querySelectorAll:selector=>selector==='.unit'?node('unitBar').children:[]};
 const localStorage={getItem:()=>null,setItem(){}};
 const sandbox={
  document,localStorage,innerWidth:390,innerHeight:760,devicePixelRatio:1,
  performance:{now:()=>0},requestAnimationFrame(fn){frame=fn;return 1},cancelAnimationFrame(){},
  clearTimeout(){},setTimeout(){return 1},addEventListener:(n,fn)=>listeners.set(n,fn),
  console,Math,
  createFrontline3d:()=>({resize(){},render(payload){lastRendered=payload}})
 };
 const executable=source.replace(/^\s*import\s*\{createFrontline3d\}\s*from\s*'\.\/frontline3d\.mjs';\s*/,'');
 assert.doesNotMatch(executable,/^\s*import\s/m);
 vm.runInNewContext(executable,sandbox,{timeout:1200});
 return {node,listeners,get frame(){return frame},get render(){return lastRendered}};
}

test('real Start and summon buttons preserve original 60 money cost and unit HP',()=>{
 const g=harness(),start=g.node('start');
 assert.equal(start.disabled,false);
 assert.equal(g.node('renderStatus').style.display,'none');
 assert.equal(g.node('startGold').textContent,'0G');
 start.dispatch('click');
 assert.equal(g.node('battleBar').hidden,false);
 assert.ok(g.node('unitBar').children.length>=1);
 const first=g.node('unitBar').children[0];
 assert.equal(first.dataset.unit,'blob');
 first.dispatch('click');
 g.frame(35);
 assert.ok(g.render?.state,'original simulation remains authoritative');
 assert.equal(g.render.state.a.length,1,'real summon spawns one team actor');
 assert.equal(g.render.state.a[0].team,'ally');
 assert.equal(g.render.state.a[0].hp,85);
 assert.equal(g.render.state.a[0].atk,20,'unchanged base damage scaling 11 x 1.8');
 assert.ok(g.render.state.money>=100&&g.render.state.money<101,'original 160-60 plus income');
 assert.equal(g.render.state.stage,1);
 assert.equal(g.render.state.ally.maxHp,1200);
 assert.equal(g.render.state.enemy.maxHp,1500);
 assert.equal(g.node('phase').textContent,'전투 중');
});
