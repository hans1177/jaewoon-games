import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('포근섬 시스템 버튼은 모바일 하단 명령바에 표시되고 시스템 대화상자로 연결된다',()=>{
 const html=read('web-games/cozy-island/index.html');
 const css=read('web-games/cozy-island/style.css');
 const script=read('web-games/cozy-island/kingdom-system.js');
 const bar=html.match(/<nav class="strategy-bar"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.equal((html.match(/id="systemCommand"/g)||[]).length,1);
 assert.match(bar,/id="systemCommand"/);
 assert.match(bar,/<small>시스템<\/small>/);
 assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
 assert.match(html,/id="systemDialog"/);
 assert.ok(script.includes("querySelector('#systemCommand')?.addEventListener('click'"));
});

test('포근섬은 곰 없이 마을·멧돼지·야생동물 애니메이션 기반을 유지한다',()=>{
  const server=read('roblox-games/cozy-island/server/Game.server.luau');
  const client=read('roblox-games/cozy-island/client/Game.client.luau');
  const style=read('roblox-games/cozy-island/shared/VisualStyle.luau');
  const factory=read('roblox-games/cozy-island/shared/WildlifeFactory.luau');
  const animator=read('roblox-games/cozy-island/shared/WildlifeAnimator.luau');

  assert.match(style,/Size=Vector3\.new\(220,10,220\)/);
  assert.match(style,/HomeIsland=\{Radius=560,Length=1280/);
  assert.match(server,/VillagePlaza",Vector3\.new\(104,1,92\)/);
  assert.match(server,/VillageGreen/);
  assert.match(server,/VillageBearCount",0/);
  assert.match(server,/CozyBearCC0Status","BLOCKED_UNVERIFIED_SOURCE"/);
  assert.doesNotMatch(server,/VILLAGE_BEAR_COUNT\s*=\s*[1-9]/);
  assert.doesNotMatch(server,/spawnVillageBears?\s*\(/);
  assert.doesNotMatch(server,/Wildlife\.Spawn\(["']BEAR["']/);
  assert.doesNotMatch(client,/WildlifeSpecies"\)\s*==\s*"BEAR"/);
  assert.match(server,/spawnMob\("BOAR"/);
  assert.match(server,/spawnMob\("RAIDER"/);
  assert.match(client,/WildlifeAnimator\.bind/);
  assert.match(client,/VibeSurvivalWildlife/);
  assert.match(factory,/AnimationController/);
  assert.match(factory,/Motor6D/);
  assert.match(animator,/stanceSample/);
  assert.match(animator,/springNumber/);
  assert.match(animator,/SPINE|spineLag/i);
  assert.doesNotMatch(factory,/BillboardGui|ImageLabel/);
});

test('포근섬 웹게임 3D는 기존 좌표·원본 에셋·터치 입력·저장을 보존한다',()=>{
  const html=read('web-games/cozy-island/index.html');
  const css=read('web-games/cozy-island/style.css');
  const renderer=read('web-games/cozy-island/render-v3.js');
  const game=read('web-games/cozy-island/game-v3.js');
  const world=read('web-games/cozy-island/world-upgrade-v3.js');
  const joystick=read('web-games/cozy-island/joystick.js');
  assert.match(html,/type="importmap"/);
  assert.match(html,/"three":"\.\.\/\.\.\/assets\/roblox\/world-ghosts\/native\/mesh\/three\/three\.module\.js"/);
  assert.match(html,/src="\.\/game-v3\.js"/);
  for(const file of ['three.module.js','OBJLoader.js','FBXLoader.js','GLTFLoader.js','SkeletonUtils.js']){
    assert.ok(renderer.includes(file),'missing source library '+file);
  }
  for(const token of ['new THREE.WebGLRenderer','this.draw3d(game)',
   'this.camera3.lookAt','load3dModels()','this.instances3d','this.models3d',
   'original.clone(true)','cloneRig(original)','game.world.h>1200',
   "put('wolf:'+wolf.id,'wolf'", "put('boar:'+boar.id,'boar'",
   "put('player','hero'", "put('fence:'+i,'fence'", "this.drawObjects(ctx,game)",
   "this.drawUnits(ctx,game)"])assert.ok(renderer.includes(token),'native 3D hook missing '+token);
  for(const token of ['homely-house/tree.obj','homely-house/house.obj',
    'homely-house/cobblestones.obj','homely-house/foliage_A.obj',
    'homely-house/gate_single.obj','forest:wolf.fbx','forest:hog.glb',
    'actor:knight.glb','actor:barbarian.glb','actor:skeleton-warrior.glb']){
    assert.ok(renderer.includes(token),'CC0 source missing '+token);
  }
  // 기존 전 지역 데이터를 자체 몬스터/전투 구조로 덮어쓰지 않고 읽기 전용 연결.
  for(const label of ['this.north3','this.west3','this.volcano3','this.cave3',
    'this.jungleWest3','production.lumberBuilt','production.mineBuilt',
    'village.defenseTowerBuilt','village.townHallBuilt',
    'game.northernMobs','game.volcanoEnemies','game.abyssEnemies',
    'game.jungleCampEnemies','game.westBoss','black-ore:','abyss-crystal:'])
    assert.ok(renderer.includes(label),'3D authored world segment missing '+label);
  for(const [file,field] of [
    ['north-region.js','game.northernMobs = mobs'],
    ['darkness-flame-v19.js','game.volcanoEnemies=regionEnemies'],
    ['abyss-cave-v23.js','game.abyssEnemies=enemies'],
    ['jungle-west-camp.js','game.jungleCampEnemies=enemies'],
    ['economy-west-v2.js','game.westBoss=westBoss']
  ])assert.ok(read('web-games/cozy-island/'+file).includes(field),
    'canonical 3D binding missing: '+file);
  assert.match(renderer,/if\(path\.endsWith\('\.obj'\)\)/);
  assert.match(renderer,/model=await new OBJLoader\(\)\.loadAsync\(url\.href\)/);
  assert.match(renderer,/snake:'forest:monster-26\.obj'/);
  assert.match(renderer,/spider:'forest:monster-53\.obj'/);
  assert.match(renderer,/golem:'forest:monster-41\.obj'/);
  assert.match(world,/currentGame\.boars=boars/);
  assert.match(game,/runtime\.loadProgress\(DEFAULT_STATE\)/);
  assert.match(game,/runtime\.queueSaveProgress\(state\)/);
  assert.match(game,/runtime\.bindTouchButton\(ui\.action,interact\)/);
  assert.match(joystick,/setPointerCapture/);
  assert.doesNotMatch(css,/(?:^|\n)\s*\/\/\s*3D/m);
  assert.match(css,/\/\* 3D 화면만 표시/);
  assert.match(css,/#island3d\s*\{/);
  assert.match(css,/#game\s*\{\s*position:absolute/);
  assert.doesNotMatch(renderer,/localStorage\.|state\.coins\s*[-+]=/);
});

test('포근섬은 2D 월드 출력 없이 WebGL 3D만 표시하고 기존 입력·저장은 유지한다',()=>{
  const renderer=read('web-games/cozy-island/render-v3.js');
  const perf=read('web-games/cozy-island/render-performance.js');
  const css=read('web-games/cozy-island/style.css');
  const html=read('web-games/cozy-island/index.html');
  const game=read('web-games/cozy-island/game-v3.js');
  assert.match(css,/#game\s*\{[^}]*opacity\s*:\s*0\s*;/);
  assert.match(css,/#game\s*\{[^}]*pointer-events\s*:\s*auto\s*;/);
  assert.match(css,/#island3d\s*\{[^}]*pointer-events\s*:\s*none\s*;/);
  assert.match(html,/id="webglStatus"/);
  assert.match(html,/id="game"/);
  assert.match(renderer,/this\.canvas\.width\s*=\s*1/);
  assert.match(renderer,/this\.canvas\.height\s*=\s*1/);
  assert.match(renderer,/new THREE\.WebGLRenderer/);
  assert.match(renderer,/this\.gl\.render\(this\.scene3,this\.camera3\)/);
  assert.doesNotMatch(renderer,/3D 렌더 오류 · 기존 렌더러 유지|WebGL 시작 실패 · 기존 화면 유지/);
  assert.match(perf,/this\.canvas\.width\s*=\s*1/);
  assert.match(perf,/this\.gl\.setSize\(this\.width, this\.height, false\)/);
  assert.match(perf,/this\.camera3\.updateProjectionMatrix\(\)/);
  assert.match(perf,/proto\.drawSea\s*=\s*function optimizedSea\(\)\s*\{\}/);
  assert.match(game,/canvas\.addEventListener\('pointerup'/);
  assert.match(game,/runtime\.loadProgress\(DEFAULT_STATE\)/);
  assert.match(game,/runtime\.queueSaveProgress\(state\)/);
});

test('포근섬 스트롱홀드식 저폴리 성채는 기존 WebGL 장면과 건설 상태에만 연결된다',()=>{
  const renderer=read('web-games/cozy-island/render-v3.js');
  const css=read('web-games/cozy-island/style.css');
  const game=read('web-games/cozy-island/game-v3.js');
  // 같은 WebGL 렌더러의 지오메트리/재질을 재사용하며 별도 2D 월드를 만들지 않는다.
  assert.match(renderer,/this\.fortGeometry=\{/);
  assert.match(renderer,/new THREE\.BoxGeometry\(1,1,1\)/);
  assert.match(renderer,/new THREE\.ConeGeometry\(1,1,4\)/);
  assert.match(renderer,/new THREE\.CylinderGeometry\(1,1,1,6\)/);
  assert.match(renderer,/flatShading:true/);
  assert.match(renderer,/if\(kind\.startsWith\('fort-'\)\)/);
  for(const name of ['fort-road','fort-wall','fort-watchtower','fort-gatehouse',
    'fort-keep','fort-cottage','fort-barracks','fort-workshop','fort-market']){
    assert.ok(renderer.includes("kind==='"+name+"'"),'3D 구조물 제작 누락: '+name);
  }
  for(const ref of ["put('home','fort-cottage'","put('market','fort-market'",
    "put('defense-tower','fort-watchtower'","put('townhall','fort-keep'",
    "put('barracks',game.state.barracksBuilt?'fort-barracks'",
    "if(village.townHallBuilt)","if(village.defenseTowerBuilt&&village.townHallBuilt)"]){
    assert.ok(renderer.includes(ref),'기존 상태 연결 누락: '+ref);
  }
  assert.match(renderer,/this\.gl\.render\(this\.scene3,this\.camera3\)/);
  assert.match(css,/#game\s*\{[^}]*opacity\s*:\s*0\s*;/);
  assert.match(game,/runtime\.queueSaveProgress\(state\)/);
  assert.doesNotMatch(renderer,/localStorage\.|state\.coins\s*[-+]=|state\.inventory\s*=/);
});
