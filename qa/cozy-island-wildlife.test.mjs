import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('cozy island expands home village and spawns five native animated bears',()=>{
  const server=read('roblox-games/cozy-island/server/Game.server.luau');
  const client=read('roblox-games/cozy-island/client/Game.client.luau');
  const style=read('roblox-games/cozy-island/shared/VisualStyle.luau');
  const factory=read('roblox-games/cozy-island/shared/WildlifeFactory.luau');
  const animator=read('roblox-games/cozy-island/shared/WildlifeAnimator.luau');

  assert.match(style,/Size=Vector3\.new\(220,10,220\)/);
  assert.match(server,/VILLAGE_BEAR_COUNT=5/);
  assert.match(server,/spawnVillageBears\(world,topY\)/);
  assert.match(server,/VillagePlaza",Vector3\.new\(104,1,92\)/);
  assert.match(server,/VillageGreen/);
  assert.match(server,/Wildlife\.Spawn\("BEAR"/);
  assert.match(server,/VillageBearCount/);
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
  assert.match(css,/\/\* 3D 메인/);
  assert.match(css,/#island3d\s*\{/);
  assert.match(css,/#game\s*\{\s*position:absolute/);
  assert.doesNotMatch(renderer,/localStorage\.|state\.coins\s*[-+]=/);
});
