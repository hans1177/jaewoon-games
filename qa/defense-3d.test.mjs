// Forest Defense: execute real game UI and wave states; assert native 3D contracts.
// The existing browser smoke separately proves an actual WebGL2 frame and 3D ray placement.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('web-games/defense/index.html','utf8');
const native=fs.readFileSync('web-games/defense/defense3d.mjs','utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('Forest Defense renders actual WebGL 3D without silently falling back to 2D',()=>{
  assert.ok(source,'original game module exists');
  assert.match(html,/data-render-target="webgl-3d"/);
  assert.match(html,/import\s*\{createDefense3d\}\s*from '\.\/defense3d\.mjs'/);
  assert.doesNotMatch(source,/\bgetContext\(\s*['"]2d['"]/);
  assert.doesNotMatch(source,/\bX\./);
  assert.match(native,/new THREE\.WebGLRenderer\(/);
  assert.match(native,/new THREE\.PerspectiveCamera\(/);
  assert.match(native,/renderer\.render\(scene,camera\)/);
  assert.match(native,/canvas\.dataset\.renderedFrame='true'/);
  assert.match(native,/document\.body\.dataset\.renderer='three-webgl'/);
  assert.match(native,/new THREE\.Raycaster\(/);
  assert.match(native,/pickRay\.ray\.intersectPlane\(floorPlane,hit\)/);
  assert.match(native,/canvas\.dataset\.renderedEnemies=/);
  assert.match(native,/function grow\(mesh,needed\)/);
  assert.match(native,/nativeArtCoverage='incomplete'/);
  assert.match(native,/webglcontextlost/);
  assert.doesNotMatch(native,/localStorage|\.hp\s*[-+]?=/);
  assert.match(html,/"three":"\.\.\/\.\.\/assets\/roblox\/world-ghosts\/native\/mesh\/three\/three\.module\.js"/);
  assert.ok(fs.existsSync('assets/roblox/world-ghosts/native/mesh/three/three.module.js'));
});

test('10-wave defense, boss scheduling, tower prices, damage, upgrades and best score preserved',()=>{
  const expected=[
    "const KEY='jaewoon-defense-v1',MAX_WAVE=10",
    "archer:{name:'궁수 타워',cost:80,range:150,damage:18,rate:.46,projectile:520}",
    "cannon:{name:'대포 타워',cost:140,range:135,damage:42,rate:1.35,projectile:350,splash:56}",
    "frost:{name:'빙결 타워',cost:120,range:130,damage:9,rate:.8,projectile:420,slow:.55,slowTime:1.4}",
    "grunt:{name:'숲 고블린',hp:80,speed:42,reward:16,damage:1,size:13}",
    "runner:{name:'그림자 러너',hp:58,speed:70,reward:18,damage:1,size:11}",
    "tank:{name:'돌갑옷 오우거',hp:230,speed:27,reward:34,damage:2,size:17}",
    "boss:{name:'고대 숲 거인',hp:1100,speed:22,reward:180,damage:5,size:25,boss:true}",
    "if(n===5||n===10)list.push('boss')",
    "state.baseHp-=e.damage",
    "if(s.splash>0)",
    "e.hp-=dmg;e.flash=1",
    "state.gold+=e.reward",
    "if(state.wave>=MAX_WAVE){endGame(true);return}",
    "state.gold-=def.cost",
    "t.level++;toast('Lv.'+t.level",
    "Math.round(selectedTower.spent*.65)",
    "JSON.stringify({best:Math.max(loadBest(),state.wave)})",
    "function moveEnemies(dt)",
    "function updateTowers(dt)",
    "function updateShots(dt)",
    "function checkWaveEnd()"
  ];
  for(const marker of expected)assert.ok(source.includes(marker),marker);
  assert.match(source,/defense3d\.render\(\{state,selectedTower/);
  assert.match(source,/defense3d\.pick\(e\.clientX,e\.clientY\)/);
});

function setupGame(){
  const nodes=new Map(),events=new Map(),buttonList=[];
  let callback=null,renderCount=0,lastRendered=null;
  function el(id){
    if(nodes.has(id))return nodes.get(id);
    const listeners=new Map(),classes=new Set();
    const node={id,style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,hidden:false,children:[],
      classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),
        contains:name=>classes.has(name),toggle:(name,v)=>v?classes.add(name):classes.delete(name)},
      addEventListener:(type,fn)=>listeners.set(type,fn),
      dispatch:(type,e)=>listeners.get(type)?.(e),
      click(){listeners.get('click')?.()},
      appendChild(child){this.children.push(child)},
      getContext(){throw Error('legacy 2D path forbidden')}
    };
    nodes.set(id,node);return node;
  }
  const buttons=['archer','cannon','frost'].map(id=>{
    const button=el('build-'+id);button.dataset.build=id;buttonList.push(button);return button;
  });
  const document={body:{dataset:{}},getElementById:el,querySelectorAll:(selector)=>selector==='[data-build]'?buttons:[]};
  const localStorage={getItem(){return null},setItem(){},removeItem(){}};
  const context=vm.createContext({
    document,innerWidth:640,innerHeight:480,devicePixelRatio:1,
    localStorage,performance:{now:()=>0},console,
    requestAnimationFrame(fn){callback=fn;return 1},
    addEventListener:(type,fn)=>events.set(type,fn),
    clearTimeout(){},setTimeout(){return 1},
    createDefense3d:({PATH_N,PADS_N})=>({
      resize(){},
      render(payload){renderCount++;lastRendered=payload;},
      pick(){return{x:PADS_N[0][0]*640,y:PADS_N[0][1]*480}}
    })
  });
  const executable=source.replace(/^\s*import\s*\{createDefense3d\}\s*from\s*'\.\/defense3d\.mjs';\s*/,'');
  assert.doesNotMatch(executable,/^\s*import\s/m);
  vm.runInContext(executable,context,{timeout:1200});
  return {el,buttons,context,events,get callback(){return callback},
    get renders(){return renderCount},get payload(){return lastRendered}};
}

test('actual game touch builds tower on 3D-picked pad at unchanged price and runs a wave',()=>{
  const game=setupGame();
  const {el,buttons}=game;
  assert.equal(el('startGame').disabled,false);
  assert.equal(el('renderStatus').style.display,'none');
  el('startGame').onclick();
  assert.equal(el('gold').textContent,'골드 240');
  buttons[0].click(); // Tap the real original Archer build button.
  let prevented=false;
  el('game').dispatch('pointerdown',{clientX:140,clientY:120,preventDefault(){prevented=true}});
  assert.ok(prevented,'3D pointer must prevent browser gesture before authoritative pick');
  assert.equal(el('gold').textContent,'골드 160','exact original archer price 80');
  assert.equal(el('towerPanel').classList.contains('on'),false);
  el('game').dispatch('pointerdown',{clientX:140,clientY:120,preventDefault(){}});
  assert.ok(el('towerPanel').classList.contains('on'),'tap existing rendered tower to select');
  assert.match(el('towerTitle').textContent,/궁수 타워 Lv\.1/);
  assert.equal(el('sell').textContent,'판매 +52','original 65% refund');
  el('startWave').onclick();
  assert.equal(el('wave').textContent,'웨이브 1 / 10');
  for(let i=1;i<40;i++)game.callback(i*33);
  assert.ok(game.renders>0,'real tick must call WebGL renderer');
  assert.ok(game.payload.state.enemies.length>=1,'the same original wave engine spawned an enemy');
  assert.equal(game.payload.state.towers.length,1);
  assert.equal(game.payload.state.towers[0].type,'archer');
});
