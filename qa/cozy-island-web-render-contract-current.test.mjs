
test('포근섬은 실제 중세 픽셀 원본과 WebGL 3D 성채 지오메트리를 함께 렌더링한다',()=>{
 const html=read('web-games/cozy-island/index.html');
 const render=read('web-games/cozy-island/render-v3.js');
 const css=read('web-games/cozy-island/style.css');
 assert.match(html,/type="importmap"/);
 assert.match(html,/id="webglStatus"/);
 for(const marker of ['new THREE.WebGLRenderer','new THREE.Scene()',
   'new THREE.OrthographicCamera','new THREE.ShapeGeometry(shape,6)',
   'new THREE.BoxGeometry(w,h,d)','new THREE.CylinderGeometry(r,r,h,8)',
   'new THREE.ConeGeometry(r,h,7)','makeFort3d(kind,height)',
   'new THREE.TextureLoader()','new THREE.SpriteMaterial',
   'this.models3d.set(kind','this.gl.render(this.scene3,this.camera3)']){
  assert.ok(render.includes(marker),'native WebGL geometry/texture missing: '+marker);
 }
 for(const original of ['oaktree.png','house1-0.png','house2-0.png','keep.png',
   'watchtower.png','castle.png','wal0000.png','wal0001.png','license.txt','sources.json']){
  assert.ok(fs.existsSync('assets/shared/medieval/'+original),'medieval source bytes missing: '+original);
 }
 assert.match(render,/new URL\('\.\.\/\.\.\/assets\/shared\/medieval\/'\+spec\.file/);
 assert.match(render,/this\.native3d=true;this\.load3dModels\(\)/);
 assert.match(css,/\/\* 3D 화면만 표시/);
 assert.match(css,/#island3d\s*\{[^}]*pointer-events\s*:\s*none\s*;/);
 assert.match(css,/#game\s*\{[^}]*opacity\s*:\s*0\s*;/);
 assert.match(css,/#game\s*\{[^}]*pointer-events\s*:\s*auto\s*;/);
});

test('포근섬의 3D 화면·지역·모바일 터치 입력은 기존 저장·전투 소유권을 유지한다',()=>{
 const renderer=read('web-games/cozy-island/render-v3.js');
 const game=read('web-games/cozy-island/game-v3.js');
 const perf=read('web-games/cozy-island/render-performance.js');
 const world=read('web-games/cozy-island/world-upgrade-v3.js');
 const joystick=read('web-games/cozy-island/joystick.js');
 for(const name of ['this.north3','this.west3','this.volcano3','this.cave3',
   'this.jungleWest3','game.northernMobs','game.volcanoEnemies',
   'game.abyssEnemies','game.jungleCampEnemies','game.westBoss',
   'black-ore:','abyss-crystal:','this.instances3d','this.models3d']){
  assert.ok(renderer.includes(name),'region/actor 3D state missing: '+name);
 }
 for(const [file,marker] of [
   ['north-region.js','game.northernMobs = mobs'],
   ['darkness-flame-v19.js','game.volcanoEnemies=regionEnemies'],
   ['abyss-cave-v23.js','game.abyssEnemies=enemies'],
   ['jungle-west-camp.js','game.jungleCampEnemies=enemies'],
   ['economy-west-v2.js','game.westBoss=westBoss']
 ])assert.ok(read('web-games/cozy-island/'+file).includes(marker),'lost region source: '+file);
 assert.match(renderer,/this\.draw3d\(game\)/);
 assert.match(renderer,/new THREE\.Raycaster\(\)/);
 assert.match(renderer,/ray\.ray\.intersectPlane\(/);
 assert.match(renderer,/return \{x:hit\.x\/SC,y:hit\.z\/SC\}/);
 assert.match(game,/canvas\.addEventListener\('pointerup'/);
 assert.match(game,/runtime\.loadProgress\(DEFAULT_STATE\)/);
 assert.match(game,/runtime\.queueSaveProgress\(state\)/);
 assert.match(world,/currentGame\.boars=boars/);
 assert.match(joystick,/setPointerCapture/);
 assert.match(perf,/proto\.drawSea\s*=\s*function optimizedSea\(\)\s*\{\}/);
 assert.match(perf,/TARGET_FRAME_MS/);
 assert.doesNotMatch(renderer,/localStorage\.|state\.coins\s*[-+]=/);
});

test('포근섬 성벽·병영·거점 및 경제 건축은 실제 3D 메시와 게임 건설 상태를 연결한다',()=>{
 const render=read('web-games/cozy-island/render-v3.js');
 const game=read('web-games/cozy-island/game-v3.js');
 const css=read('web-games/cozy-island/style.css');
 for(const marker of ['ECONOMY_3D_LOOK','BUILDING_SIGNS',
   "if(kind==='fort-wall'||kind==='fort-wall-side')",
   "if(kind==='fort-watchtower')","if(kind==='fort-gatehouse')",
   "if(kind==='fort-keep')","if(kind==='fort-road')",
   'new THREE.Mesh(geo,m[mat])',
   'village.townHallBuilt','village.defenseTowerBuilt',
   'production.lumberBuilt','production.mineBuilt',
   'game.state.barracksBuilt',
   "put('home','fort-cottage'","put('market','fort-market'",
   "put('defense-tower','fort-watchtower'",
   "put('townhall','fort-keep'",
   "put('barracks',game.state.barracksBuilt",
   "put('economic:'+id+':'+i",
   "put('custom-fort:'+i",
   "const key='construction-preview:'+i",
   'this.gl.render(this.scene3,this.camera3)']){
  assert.ok(render.includes(marker),'3D fort/state mapping missing: '+marker);
 }
 assert.match(render,/g\.userData\.flags=\[\];g\.userData\.smoke=\[\]/);
 assert.match(css,/#game\s*\{[^}]*opacity\s*:\s*0\s*;/);
 assert.match(game,/runtime\.queueSaveProgress\(state\)/);
 assert.doesNotMatch(render,/localStorage\.|state\.coins\s*[-+]=|state\.inventory\s*=/);
});
