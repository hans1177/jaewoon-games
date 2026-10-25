import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('포근섬 메뉴는 중복 없이 건설·영지·군사·왕국·설정 다섯 종류로 묶는다',()=>{
 const html=read('web-games/cozy-island/index.html');
 const css=read('web-games/cozy-island/style.css');
 const game=read('web-games/cozy-island/game-v3.js');
 const kingdom=read('web-games/cozy-island/kingdom-system.js');
 const bar=html.match(/<nav class="strategy-bar"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.equal((bar.match(/class="strategy-button"/g)||[]).length,5);
 for(const name of ['건설','영지','군사','왕국','설정'])
   assert.match(bar,new RegExp('<small>'+name+'</small>'));
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 for(const marker of ['openTerritoryMenu','openMilitaryMenu','cozy:open-system','cozy:open-barracks'])
   assert.ok(game.includes(marker),'빠진 메뉴 연결: '+marker);
 assert.match(kingdom,/menuMode==='kingdom'/);
 assert.match(html,/id="systemDialog"/);
});

test('포근섬 중세 디테일과 작은 건물 이름·검색·즐겨찾기는 기존 렌더러/건설창에 연결된다',()=>{
 const html=read('web-games/cozy-island/index.html');
 const renderer=read('web-games/cozy-island/render-v3.js');
 const construction=read('web-games/cozy-island/village-defense.js');
 const css=read('web-games/cozy-island/style.css');
 for(const marker of ['const masonry=','const gable=','const hut=','fort-lantern','fort-wagon','label.scale.set(1.85,.43,1)','nameLabel.visible=zoom>=.62'])
   assert.ok(renderer.includes(marker),'건물 디테일 누락: '+marker);
 for(const marker of ['realmBuildSearch','realmBuildFavoritesOnly','buildingFavorites','realm-shortage'])
   assert.ok(construction.includes(marker),'건설 편의 기능 누락: '+marker);
 assert.match(css,/\.realm-build-card\[hidden\]/);
 assert.match(html,/id="barracksCommand"/);
});

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

test('포근섬 웹게임 3D는 실제 중세 입체 모델·기존 월드·터치·저장을 유지한다',()=>{
 const html=read('web-games/cozy-island/index.html');
 const css=read('web-games/cozy-island/style.css');
 const renderer=read('web-games/cozy-island/render-v3.js');
 const game=read('web-games/cozy-island/game-v3.js');
 const world=read('web-games/cozy-island/world-upgrade-v3.js');
 assert.match(html,/type="importmap"/);
 assert.match(html,/"three":"\.\.\/\.\.\/assets\/roblox\/world-ghosts\/native\/mesh\/three\/three\.module\.js"/);
 assert.match(html,/src="\.\/game-v3\.js"/);
 for(const token of ['three.module.js','new THREE.WebGLRenderer','this.draw3d(game)',
  'this.camera3.lookAt','load3dModels()','this.instances3d','this.models3d',
  'new THREE.BoxGeometry(w,h,d)','new THREE.ConeGeometry(r,h,7)',
  'new THREE.CylinderGeometry(r,r,h,8)','makeFort3d(kind,height)',
  "put('wolf:'+wolf.id,'wolf'","put('boar:'+boar.id,'boar'",
  "put('townhall','fort-keep'","put('fence:'+i,'fence'",
  "this.drawObjects(ctx,game)","this.drawUnits(ctx,game)"])
   assert.ok(renderer.includes(token),'3D 원본 기능 누락: '+token);
 for(const label of ['this.north3','this.west3','this.volcano3','this.cave3',
   'this.jungleWest3','production.lumberBuilt','production.mineBuilt',
   'village.defenseTowerBuilt','village.townHallBuilt',
   'game.northernMobs','game.volcanoEnemies','game.abyssEnemies',
   'game.jungleCampEnemies','game.westBoss','black-ore:','abyss-crystal:'])
   assert.ok(renderer.includes(label),'지역 상태 연결 누락: '+label);
 for(const [file,field] of [
   ['north-region.js','game.northernMobs = mobs'],
   ['darkness-flame-v19.js','game.volcanoEnemies=regionEnemies'],
   ['abyss-cave-v23.js','game.abyssEnemies=enemies'],
   ['jungle-west-camp.js','game.jungleCampEnemies=enemies'],
   ['economy-west-v2.js','game.westBoss=westBoss']
 ])assert.ok(read('web-games/cozy-island/'+file).includes(field),
   '기존 지역 진행도 연결 누락: '+file);
 assert.match(renderer,/new URL\('\.\.\/\.\.\/assets\/shared\/medieval\//);
 assert.match(world,/currentGame\.boars=boars/);
 assert.match(game,/runtime\.loadProgress\(DEFAULT_STATE\)/);
 assert.match(game,/runtime\.queueSaveProgress\(state\)/);
 assert.match(game,/runtime\.bindTouchButton\(ui\.castle,/);
 assert.match(game,/canvas\.addEventListener\('pointerup'/);
 assert.doesNotMatch(renderer,/put\('player','hero'/);
 assert.doesNotMatch(renderer,/localStorage\.|state\.coins\s*[-+]=/);
 assert.match(css,/#game\s*\{\s*position:absolute/);
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
  // 원래 입체 렌더러의 해상도·투영 처리를 재사용한다. 성능 모듈은 프레임 스케줄만 다룬다.
  assert.match(renderer,/this\.gl\.setSize\(Math\.ceil\(this\.width\/this\.pixelScale\)/);
  assert.match(renderer,/this\.camera3\.updateProjectionMatrix\(\)/);
  assert.match(perf,/const originalDraw = proto\.draw/);
  assert.match(perf,/return originalDraw\.call\(this, game\)/);
  assert.match(perf,/proto\.drawSea\s*=\s*function optimizedSea\(\)\s*\{\}/);
  assert.match(game,/canvas\.addEventListener\('pointerup'/);
  assert.match(game,/runtime\.loadProgress\(DEFAULT_STATE\)/);
  assert.match(game,/runtime\.queueSaveProgress\(state\)/);
});

test('포근섬 스트롱홀드식 저폴리 성채는 기존 WebGL 장면과 건설 상태에만 연결된다',()=>{
  const renderer=read('web-games/cozy-island/render-v3.js');
  const css=read('web-games/cozy-island/style.css');
  const game=read('web-games/cozy-island/game-v3.js');
  // 실제 원본 3D 렌더러는 도형별 크기를 직접 생성해 메시를 조립한다.
  // 존재하지 않는 구버전 저폴리 캐시가 아니라 현행 생성 함수와 재질을 검증한다.
  assert.match(renderer,/makeFort3d\(kind,height\)/);
  assert.match(renderer,/new THREE\.BoxGeometry\(w,h,d\)/);
  assert.match(renderer,/new THREE\.ConeGeometry\(r,h,7\)/);
  assert.match(renderer,/new THREE\.CylinderGeometry\(r,r,h,8\)/);
  assert.match(renderer,/new THREE\.MeshLambertMaterial/);
  assert.match(renderer,/Object\.values\(ECONOMY_3D_LOOK\)\]\.includes\(kind\)/);
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
