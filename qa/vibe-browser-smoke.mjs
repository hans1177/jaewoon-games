// 파일명: qa/vibe-browser-smoke.mjs
// Browser smoke test: run with `node qa/vibe-browser-smoke.mjs` after `npx playwright install chromium`.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const port=Number(process.env.VIBE_SMOKE_PORT||8765);
const root=process.env.VIBE_SMOKE_ROOT||'_site';
const liveBase=String(process.env.VIBE_SMOKE_LIVE_BASE||'').trim();
if(liveBase){
 const pageUrl=new URL(liveBase);
 assert.equal(pageUrl.protocol,'https:','Post-publication browser QA requires HTTPS');
 assert.equal(pageUrl.host,'hans1177.github.io','Post-publication smoke is scoped to the official GitHub Pages host');
 assert.equal(pageUrl.pathname,'/jaewoon-games/','Post-publication smoke must verify canonical Pages project');
}
// Preview intentionally requires an actual approved GLB; never bypass that safety gate.
const model='assets/shared/humanoid-traveler.glb';
if(!liveBase)assert.ok(fs.existsSync(path.join(root,model)),'Browser smoke must use a real staged GLB model');
const server=liveBase?null:spawn('python3',['-m','http.server',String(port),'--directory',root],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 // 푸른항해: 공개판의 실제 저장 형식으로 교전을 시작하고 GLB·포격·복귀를 검증한다.
 if(liveBase){
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){
   const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});
   const ocean=await context.newPage(),faults=[];ocean.on('pageerror',e=>faults.push(e.message));
   await ocean.addInitScript(()=>{const raw=sessionStorage.getItem('ocean-smoke-next-save');if(raw){localStorage.setItem('jg-ocean-voyage-v1',raw);sessionStorage.removeItem('ocean-smoke-next-save');}});
   try{
    await ocean.goto(liveBase+'web-games/ocean-voyage/',{waitUntil:'networkidle'});
    await ocean.evaluate(async()=>{
     const e=await import('./engine.mjs'),s=e.newGame();s.heroChosen=true;s.autoCombat=false;
     s.ship.x=-87;s.ship.z=-576;s.ship.heading=0;s.ship.cooldown=0;
     s.pirates=[{id:1,x:-75,z:-576,heading:1.7,hull:1,maxHull:62,cooldown:999}];
     sessionStorage.setItem('ocean-smoke-next-save',e.serializeGame(s));
    });
    await ocean.reload({waitUntil:'domcontentloaded'});
    await ocean.locator('#start').click();
    await ocean.locator('#navalEncounter').waitFor({state:'visible',timeout:20000});
    await ocean.waitForFunction(()=>document.getElementById('naval3d')?.dataset.ready==='true',null,{timeout:45000});
    const proof=await ocean.locator('#naval3d').evaluate(c=>({models:+c.dataset.models,triangles:+c.dataset.triangles,webgl:!!(c.getContext('webgl2')||c.getContext('webgl')),width:c.width,height:c.height}));
    assert.ok(proof.webgl&&proof.models>=2&&proof.triangles>1000,'OCEAN_REAL_GLB_BATTLE_MISSING '+JSON.stringify(proof));
    for(const id of ['joystickRim','fire','navalRetreat']){
     const box=await ocean.locator('#'+id).boundingBox();assert.ok(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,'OCEAN_TOUCH_CLIPPED '+id);
    }
    await ocean.screenshot({path:'ocean-naval-'+viewport.width+'.png'});
    await ocean.locator('#fire').click();
    await ocean.locator('#navalEncounter').waitFor({state:'hidden',timeout:15000});
    // [해전 종료] 3D 항해 화면은 계속 유지하고 전투 카메라만 일반 항해 시점으로 복귀한다.
    // 기존 항해 3D를 끄는 예전 기준은 실제 정상 동작을 타임아웃으로 잘못 처리한다.
    await ocean.locator('#naval3d').waitFor({state:'visible',timeout:15000});
    await ocean.waitForFunction(()=>{
     const canvas=document.getElementById('naval3d');
     return canvas&&!canvas.hidden&&['chase','angle'].includes(canvas.dataset.camera)
       &&Number(canvas.dataset.models)>=1;
    },null,{timeout:15000});
    const saved=await ocean.evaluate(async()=>{const e=await import('./engine.mjs');return e.loadGame(localStorage);});
    assert.equal(saved.victories,1,'OCEAN_VICTORY_NOT_SAVED');assert.equal(saved.supplies.ammo,39,'OCEAN_AMMO_RULE_CHANGED');
    await ocean.reload({waitUntil:'networkidle'});assert.equal(await ocean.locator('#navalEncounter').isVisible(),false,'OCEAN_VICTORY_RELOAD_REENTERS_BATTLE');
    // 같은 세이브로 조타 이탈을 실제로 실행한다. 전투 중 위치를 조작하지 않는다.
    await ocean.evaluate(async()=>{const e=await import('./engine.mjs'),s=e.newGame();s.heroChosen=true;s.autoCombat=false;s.ship.x=-116;s.ship.z=-576;s.ship.heading=-Math.PI/2;s.ship.velocity=5;s.pirates=[{id:1,x:-75,z:-576,heading:0,hull:62,maxHull:62,cooldown:999}];sessionStorage.setItem('ocean-smoke-next-save',e.serializeGame(s));});
    await ocean.reload({waitUntil:'domcontentloaded'});await ocean.locator('#start').click();await ocean.locator('#navalEncounter').waitFor({state:'visible',timeout:15000});
    await ocean.locator('#navalRetreat').click();await ocean.keyboard.down('ArrowUp');
    await ocean.locator('#navalEncounter').waitFor({state:'hidden',timeout:25000});await ocean.keyboard.up('ArrowUp');
    assert.deepEqual(faults,[],'OCEAN_RUNTIME_ERRORS');
    console.log('OCEAN_NAVAL_3D_VICTORY_SAVE_RETREAT_MOBILE=PASS '+JSON.stringify({viewport,...proof}));
   }finally{await context.close();}
  }
 }
 const page=await browser.newPage({viewport:{width:1100,height:720}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const url=(liveBase||'http://127.0.0.1:'+port+'/')+'assets/vibe-model-preview.html?asset='+encodeURIComponent(model);
 let loaded=false;
 for(let i=0;i<30;i++){try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:2000});loaded=!!response;break}catch{await new Promise(r=>setTimeout(r,250))}}
 assert.ok(loaded,'Preview page did not load');
 assert.equal((await page.locator('#message').count())>0,true,'Preview must keep its real status view');
 await page.getByRole('button',{name:'walk',exact:true}).click();
 await page.getByRole('combobox',{name:'표정'}).selectOption('joy');
 await page.getByRole('button',{name:'장면 실행'}).click();
 await page.getByRole('button',{name:'타격 연출 테스트'}).click();
 await page.waitForTimeout(180);
 assert.equal(await page.getByRole('status').last().textContent(),'타격');
 const checkbox=page.getByRole('checkbox');
 await checkbox.check();
 await page.getByRole('button',{name:'타격 연출 테스트'}).click();
 assert.equal(await checkbox.isChecked(),true);
 assert.deepEqual(errors,[],'Uncaught browser exceptions');
 if(liveBase){
  // 보석생존전: 실제 공개 커밋의 스테이지·월드·입력·일시정지를 검사한다.
  const response=await page.request.get(liveBase+'web-games/publish-manifest.json');
  assert.ok(response.ok(),'GEM_PUBLIC_MANIFEST_HTTP');
  assert.equal((await response.json()).sourceSha,process.env.GITHUB_SHA,'GEM_PUBLIC_SOURCE_SHA');
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1100,height:720},isMobile:mobile,hasTouch:mobile});
   const gem=await context.newPage(),gemErrors=[];
   gem.on('pageerror',e=>gemErrors.push(e.message));
   gem.on('console',msg=>{if(msg.type()==='error'&&/THREE|shader|WebGL/i.test(msg.text()))gemErrors.push(msg.text())});
   try{
    for(const hero of ['guardian','ranger','wizard','rogue','cleric']){
     const route=await gem.goto(liveBase+'web-games/gem-survivor/',{waitUntil:'domcontentloaded'});
     assert.ok(route?.ok(),'GEM_ROUTE_HTTP');
     await gem.locator('#startBtn').waitFor({state:'visible'});
     await gem.waitForFunction(()=>!document.getElementById('startBtn').disabled,null,{timeout:60000});
     const stage='cavern';
     assert.equal(await gem.locator('button[data-stage]').count(),0,'GEM_MAP_PICKER_REMOVED');
     await gem.locator('button[data-hero="'+hero+'"]').click();
     assert.equal(await gem.locator('button[data-hero="'+hero+'"]').getAttribute('aria-pressed'),'true');
     await gem.locator('#startBtn').click();
     await gem.waitForFunction(id=>document.getElementById('game').dataset.stage===id,stage);
     const canvas=gem.locator('#game');
     assert.equal(await canvas.getAttribute('data-world-width'),'4200');
     assert.equal(await canvas.getAttribute('data-world-height'),'3200');
     assert.equal(await canvas.getAttribute('data-authored-monster-kinds'),'14');
     assert.equal(await canvas.getAttribute('data-player-hp'),'200');
     assert.ok(Number(await canvas.getAttribute('data-glow-instances'))>0);
     assert.ok(Number(await canvas.getAttribute('data-glow-instances'))<=256);
     assert.ok(Number(await canvas.getAttribute('data-particle-instances'))<=360);
     const first=Number(await canvas.getAttribute('data-player-x'));
     if(mobile){
      const bounds=await gem.locator('#joystick').boundingBox();
      const cdp=await context.newCDPSession(gem);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width/2+30,y:bounds.y+bounds.height/2}]});
      await gem.waitForTimeout(700);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await cdp.detach();
     }else{
      await gem.keyboard.down('d');await gem.waitForTimeout(700);await gem.keyboard.up('d');
     }
     const moved=Number(await canvas.getAttribute('data-player-x'));
     assert.ok(moved>first+25,'GEM_MOVE_'+(mobile?'TOUCH':'KEYBOARD'));
     await gem.locator('#pauseBtn').click();
     const paused=Number(await canvas.getAttribute('data-player-x'));
     await gem.keyboard.down('d');await gem.waitForTimeout(200);await gem.keyboard.up('d');
     assert.equal(Number(await canvas.getAttribute('data-player-x')),paused,'GEM_PAUSE_MOVEMENT');
     await gem.locator('#resumeBtn').click();
     await gem.locator('#heroSkill').click();
     assert.ok(await gem.evaluate(()=>window.gemSurvivorState().player.skillCd>0),'GEM_HERO_SKILL_COOLDOWN');
     if(hero==='guardian')for(const id of ['garden','forge','frost','abyss']){
      await gem.evaluate(()=>{const g=window.gemSurvivorState();g.spawnBoss();const boss=g.enemies.find(e=>e.boss);g.killEnemy(boss,g.enemies.indexOf(boss));g.nextStage();});
      await gem.waitForFunction(expected=>document.getElementById('game').dataset.stage===expected,id);
     }
     assert.equal(await canvas.getAttribute('data-rendered-frame'),'true');
     assert.equal(await canvas.getAttribute('data-fallback-enemy-assets'),'0');
     assert.deepEqual(gemErrors,[],'GEM_RUNTIME_ERRORS');
     console.log('GEM_SURVIVOR_PUBLIC_PLAY_PASS '+JSON.stringify({sourceSha:process.env.GITHUB_SHA,mobile,hero,stage,first,moved}));
    }
   }finally{await context.close()}
  }
 }
 if(liveBase){
  // Post-deploy validation of the REAL Magic Forest, not just the model viewer.
  // This block only runs against the official public GitHub Pages URL after
  // the deployment step has already published the exact current revision.
  const requiredRevision=String(process.env.GITHUB_SHA||'').trim();
  assert.match(requiredRevision,/^[0-9a-f]{40}$/i,'Published revision is required for native game QA');
  const manifestResponse=await page.request.get(liveBase+'web-games/publish-manifest.json');
  assert.equal(manifestResponse.ok(),true,'Published source manifest must be reachable');
  const manifest=await manifestResponse.json();
  assert.equal(manifest.sourceSha,requiredRevision,'Only inspect the exact deployed source revision');

  for(const viewport of [
   {name:'desktop',width:1100,height:720,mobile:false},
   {name:'mobile',width:390,height:844,mobile:true}
  ]){
   const game=await browser.newPage({
    viewport:{width:viewport.width,height:viewport.height},
    isMobile:viewport.mobile,hasTouch:viewport.mobile,
    deviceScaleFactor:viewport.mobile?1.5:1
   });
   const gameErrors=[];
   game.on('pageerror',err=>gameErrors.push(err.message));
   try{
    const route=liveBase+'web-games/fantasy-survival/';
    const response=await game.goto(route,{waitUntil:'domcontentloaded',timeout:30000});
    assert.ok(response?.ok(),viewport.name+': game route HTTP error');
    assert.equal(await game.locator('#world3d').count(),1,
     viewport.name+': actual WebGL game surface is missing');
    await game.locator('#startPlay').click();
    await game.locator('#startNormal').click();
    // 실제 공개 모바일 화면: 기존 게임 조작·상단 UI와 별도 저장 설정을 검사한다.
    const hudMeasure=async()=>game.evaluate(()=>{
      const box=sel=>{const el=document.querySelector(sel);if(!el)return null;
       const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
      return {vw:innerWidth,vh:innerHeight,stick:box('#stick'),combat:box('.actions'),
       attack:box('#attack'),quick:box('.quickMenu'),map:box('#miniMapWrap'),hud:box('.hud>.card.main'),
       guide:!!document.getElementById('hudGuideOpen'),quickIds:[...document.querySelectorAll('.quickMenu>button')].map(x=>x.id)};
    });
    const hud=await hudMeasure();
    assert.deepEqual(hud.quickIds,['inventory','craft','map'],viewport.name+': utility shortcuts must remain separate from combat');
    assert.ok(hud.guide,viewport.name+': accessible control guide missing');
    const intersects=(a,b)=>a&&b&&a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
    assert.ok(!intersects(hud.attack,hud.stick),viewport.name+': attack overlaps movement joystick');
    assert.ok(!intersects(hud.quick,hud.combat),viewport.name+': utility menu overlaps combat controls');
    assert.ok(hud.attack?.x>=-1&&hud.attack?.right<=hud.vw+1,
      viewport.name+': attack control clipped off screen');
    if(viewport.mobile){
      await game.locator('#questToggle').click();
      assert.equal(await game.locator('#questToggle').getAttribute('aria-expanded'),'true',
       'mobile quest must expand with a tap');
      await game.locator('#questToggle').click();
      await game.locator('.hudMenu>summary').click();
      await game.locator('#options').click();
      await game.locator('#hudHandedness').selectOption('left');
      await game.locator('#hudSize').selectOption('108');
      const prefs=await game.evaluate(()=>({
       hand:document.body.dataset.hudHand,size:document.body.dataset.hudSize,
       stored:JSON.parse(localStorage.getItem('magic-forest-ui-v1')||'null')
      }));
      assert.equal(prefs.hand,'left');
      assert.equal(prefs.size,'108');
      assert.equal(prefs.stored?.hand,'left');
      assert.equal(prefs.stored?.size,108);
      await game.locator('#optionsClose').click();
      const swapped=await hudMeasure();
      assert.ok(swapped.attack.x<swapped.stick.x,
        'mobile left-hand mode must put combat on the left and movement on the right');
      assert.ok(!intersects(swapped.attack,swapped.stick),'mirrored controls overlap');
      await game.locator('.hudMenu>summary').click();
      await game.locator('#hudGuideOpen').click();
      assert.equal(await game.locator('#hudGuide').isVisible(),true,'touch guide must be visible');
      await game.locator('#hudGuideClose').click();
      assert.equal(await game.locator('#hudGuide').isHidden(),true,'touch guide must close');
    }
    console.log('MAGIC_FOREST_HUD_LAYOUT_LIVE_PASS '+viewport.name+' '+JSON.stringify(hud));
    try{
      await game.waitForFunction(()=>document.body.dataset.spatialDimension==='3d',
       null,{timeout:60000});
    }catch(error){
      const diagnostic=await game.evaluate(()=>({
        dimension:document.body.dataset.spatialDimension,
        coverage:document.body.dataset.nativeMonsterCoverage,
        avatarSource:document.body.dataset.nativePlayerSource,
        display:document.getElementById('world3d')?.hidden
      })).catch(e=>({evaluationError:String(e)}));
      console.error('MAGIC_FOREST_NATIVE_3D_START_FAIL '+viewport.name+' '+JSON.stringify({diagnostic,errors:gameErrors}));
      throw error;
    }
    const metrics=await game.evaluate(()=>{
     const canvas=document.getElementById('world3d');
     const gl=canvas?.getContext('webgl2');
     const data=document.body.dataset;
     return {visible:!!canvas&&!canvas.hidden,
      width:canvas?.width||0,height:canvas?.height||0,
      webgl:gl?String(gl.getParameter(gl.VERSION)):'',
      mode:data.spatialDimension,coverage:data.nativeMonsterCoverage||'',
      drawCalls:Number(data.nativeDrawCalls||0),
      triangles:Number(data.nativeTriangles||0),
      playerX:Number(data.playerX),playerY:Number(data.playerY)};
    });
    assert.ok(metrics.visible&&metrics.width>150&&metrics.height>150,
     viewport.name+': WebGL canvas never became a real visible game frame');
    assert.match(metrics.webgl,/WebGL 2/i,viewport.name+': live game is not WebGL2');
    assert.ok(metrics.drawCalls>4&&metrics.triangles>400,
     viewport.name+': WebGL2 exists but real game geometry was not rendered');
    assert.equal(metrics.coverage,'currently-mapped',
     viewport.name+': an invisible original enemy may be present');
    assert.deepEqual(gameErrors,[],viewport.name+': uncaught browser errors before movement');
    // 실제 배포된 원본 CC0 장비 그림을 데스크톱·모바일 모두 열고 로딩까지 확인한다.
    await game.locator('#heroPortrait').click();
    assert.equal(await game.locator('.arpgInventory').isVisible(),true,
      viewport.name+': character inventory did not open');
    const equippedIcons=game.locator('.arpgGearMark .arpgIcon');
    assert.ok((await equippedIcons.count())>=4,
      viewport.name+': the four original equipment slots must retain icons when slots are added');
    await game.waitForFunction(()=>[...document.querySelectorAll('.arpgGearMark .arpgIcon')]
      .every(img=>img.complete&&img.naturalWidth>=64&&img.naturalHeight>=64),
      null,{timeout:15000});
    await game.locator('#arpgBagSearch').fill('나무');
    assert.ok((await game.locator('#arpgResultCount').textContent()).includes('표시'),
      viewport.name+': item search did not refresh');
    await game.locator('[data-arpg-filter="equipment"]').click();
    assert.equal(await game.locator('[data-arpg-filter="equipment"]').getAttribute('aria-pressed'),'true');
    await game.locator('#close').click();
    assert.equal(await game.locator('.arpgInventory').count(),1,
      viewport.name+': closing inventory should preserve existing panel contents');
    assert.equal(await game.locator('#sheet').getAttribute('class').then(x=>x.includes('open')),false);
    console.log('MAGIC_FOREST_CC0_INVENTORY_LIVE_PASS '+viewport.name);
    // Real published GLB swap, not a dropdown-only or source-marker check.
    if(!viewport.mobile){
      // 캐릭터 꾸미기는 접힌 모험가 메뉴를 통해 연다.
      await game.locator('.hudMenu>summary').click();
      await game.locator('#avatarOpen').click();
      assert.equal(await game.locator('#avatarPanel').isVisible(),true,
        'avatar menu must open the character customizer');
      await game.locator('#avatarModel').selectOption('mage');
      await game.locator('#avatarSize').selectOption('110');
      await game.locator('#avatarApply').click();
      await game.waitForFunction(()=>{
        const canvas=document.getElementById('world3d');
        const src=document.body.dataset.nativePlayerSource||'';
        const save=JSON.parse(localStorage.getItem('jaewoon_fantasy_survival_avatar_v1')||'null');
        return canvas&&!canvas.hidden&&document.body.dataset.spatialDimension==='3d'
          &&src.endsWith('/assets/roblox/actors/native/mage.glb')
          &&save?.model==='mage'&&save?.size===110;
      },null,{timeout:40000});
      assert.equal(await game.locator('#avatarPanel').isHidden(),true,'CC0 avatar panel must close after applying');
      assert.ok(Number(await game.locator('body').getAttribute('data-native-triangles'))>400,
        'CC0 avatar replacement did not preserve real WebGL geometry');
    }
    // Test the existing gameplay state authority, not a replacement 3D demo.
    const firstX=metrics.playerX;
    await game.keyboard.down('d');
    await game.waitForTimeout(850);
    await game.keyboard.up('d');
    const lastX=await game.locator('body').getAttribute('data-player-x');
    assert.ok(Number(lastX)>firstX+1,
     viewport.name+': keyboard input failed to move original game state');
    const afterMode=await game.locator('body').getAttribute('data-spatial-dimension');
    assert.equal(afterMode,'3d',viewport.name+': 3D disappeared after real game input');
    // Original pagehide handler writes the existing save. A reload must recover it.
    await game.reload({waitUntil:'domcontentloaded',timeout:30000});
    await game.locator('#startPlay').click();
    await game.locator('#startNormal').click();
    await game.waitForFunction(()=>document.body.dataset.spatialDimension==='3d',
     null,{timeout:60000});
    const restoredX=Number(await game.locator('body').getAttribute('data-player-x'));
    assert.ok(Math.abs(restoredX-Number(lastX))<100,
     viewport.name+': saved player position was not restored');
    assert.deepEqual(gameErrors,[],viewport.name+': uncaught errors in save/reload cycle');
    if(!viewport.mobile){
      await game.waitForFunction(()=>document.body.dataset.nativePlayerSource?.endsWith('/assets/roblox/actors/native/mage.glb'),
        null,{timeout:40000});
      assert.equal(JSON.parse(await game.evaluate(()=>localStorage.getItem('jaewoon_fantasy_survival_avatar_v1'))).size,110,
        'CC0 visual size does not persist after reload');
    }
    console.log('MAGIC_FOREST_NATIVE_3D_LIVE_PASS '+viewport.name+' '+
     JSON.stringify({sourceSha:requiredRevision,metrics,savedPlayerX:restoredX}));
   }finally{await game.close()}
  }
 }
 // Cozy Island RTS: run on the real published GitHub Pages only, after deployment.
 if(liveBase){
  // 공개 후: 경로 보존, 수평/수직 성문 자동 방향과 인부 길찾기의 실제 JS 모듈 검사.
  // 사후검증 체크아웃에는 qa 스크립트만 있으므로 실제 공개 모듈을 받아 검사한다.
  const castleResponse=await page.request.get(liveBase+'web-games/cozy-island/castle-layout.js');
  assert.ok(castleResponse.ok(),'COZY_LAYOUT_LIVE_SOURCE_MISSING');
  const castleSource=await castleResponse.text();
  const castle=await import('data:text/javascript;base64,'+Buffer.from(castleSource).toString('base64'));
  const continuous=castle.wallLine({x:0,y:0},{x:270,y:180});
  assert.equal(continuous.length,6,'COZY_WALL_DRAG_GAPS_DETECTED');
  for(let i=1;i<continuous.length;i++){
    assert.equal(Math.hypot(continuous[i].x-continuous[i-1].x,continuous[i].y-continuous[i-1].y),
      90,'COZY_WALL_DRAG_NONCONTIGUOUS');
  }
  const gate={kind:'gate',x:450,y:630,hp:200,axis:'horizontal',open:true};
  assert.equal(castle.neighborGateAxis(gate,[
    gate,{kind:'wall',x:360,y:630,hp:140},{kind:'wall',x:540,y:630,hp:140}
  ]),'horizontal','COZY_GATE_HORIZONTAL_ALIGNMENT');
  assert.equal(castle.neighborGateAxis(gate,[
    gate,{kind:'wall',x:450,y:540,hp:140},{kind:'wall',x:450,y:720,hp:140}
  ]),'vertical','COZY_GATE_VERTICAL_ALIGNMENT');
  const pathBefore=castle.findWorkerRoute({x:390,y:820},{x:785,y:965},[]);
  const pathDetour=castle.findWorkerRoute({x:390,y:820},{x:785,y:965},
    [{kind:'wall',x:450,y:810,hp:140}]);
  assert.ok(pathBefore.length>0&&pathDetour.length>0&&
     !pathDetour.some(p=>p.x===450&&p.y===810),
    'COZY_WORKER_PATH_DID_NOT_AVOID_WALL');
  assert.equal(castle.validateWallLayout([],[
    {kind:'wall',x:360,y:810,hp:140}
  ]).ok,false,'COZY_WALL_ALLOWED_BLOCKED_STOCKPILE');
  console.log('COZY_LAYOUT_WORKER_GATE_PATH_POSTDEPLOY=PASS');
   // 저장 호환/생산 자동화: 빈 옛 영지는 식량원이 생성되고 작업 인원을 실제로 배치한다.
   const economySource=await page.request.get(liveBase+'web-games/cozy-island/production-buildings.js');
   assert.ok(economySource.ok(),'COZY_ECONOMY_LIVE_MODULE_MISSING');
   assert.match(await economySource.text(),/foodSupplyInitialized/,'COZY_STARTER_FOOD_MIGRATION_MISSING');
   const northAttack=castle.siegeTargetForUnit({_siegePoint:{key:'north',x:790,y:245}});
   const eastAttack=castle.siegeTargetForUnit({_siegeLane:610});
   assert.deepEqual(northAttack,{key:'north',x:790,y:245},'COZY_LORD_NORTH_ENTRY_WRONG');
   assert.deepEqual(eastAttack,{key:'gate',x:1355,y:610},'COZY_LORD_EAST_GATE_ENTRY_WRONG');
   assert.equal(castle.siegeBarrierClosed({
     walls:{gate:300},drawbridgeClosed:true,structures:[{kind:'gate',open:true,hp:320}]
   },eastAttack),true,'COZY_REMOTE_GATE_BYPASS');
   assert.equal(castle.siegeBarrierClosed({walls:{gate:300},drawbridgeClosed:false},eastAttack),
     false,'COZY_OPEN_BRIDGE_BLOCKED');
   assert.equal(castle.siegeBarrierClosed({walls:{north:0}},northAttack),
     false,'COZY_NORTH_WALL_BREACH_BLOCKED');
   console.log('COZY_LORD_ASSAULT_BREACH_RULES_POSTDEPLOY=PASS');
  const expected=String(process.env.GITHUB_SHA||'').trim();
  assert.match(expected,/^[0-9a-f]{40}$/i,'COZY_RTS_REVISION_REQUIRED');
  const res=await page.request.get(liveBase+'web-games/publish-manifest.json');
  assert.ok(res.ok(),'COZY_RTS_LIVE_MANIFEST_MISSING');
  const manifest=await res.json();
  assert.equal(manifest.sourceSha,expected,'COZY_RTS_LIVE_REVISION_MISMATCH');
  assert.ok(manifest.routes.includes('web-games/cozy-island/'),'COZY_RTS_ROUTE_NOT_PUBLISHED');
  for(const view of [{name:'desktop',width:1100,height:720,mobile:false},
                     {name:'mobile',width:390,height:844,mobile:true}]){
   const cozy=await browser.newPage({viewport:{width:view.width,height:view.height},
     isMobile:view.mobile,hasTouch:view.mobile});
   const errors=[];cozy.on('pageerror',err=>errors.push(err.message));
   try{
    const response=await cozy.goto(liveBase+'web-games/cozy-island/',
      {waitUntil:'domcontentloaded',timeout:35000});
    assert.ok(response?.ok(),view.name+': COZY_RTS_ROUTE_OFFLINE');
    await cozy.waitForFunction(()=>{
      const canvas=document.querySelector('#island3d'),status=document.querySelector('#webglStatus');
      const input=document.querySelector('#game');
      if(!canvas||!status?.hidden||!input)return false;
      const gl=canvas.getContext('webgl2');
      return input.width===1&&input.height===1&&canvas.width>250&&canvas.height>250
       &&!!gl&&gl.getParameter(gl.VIEWPORT)[2]>250;
    },null,{timeout:30000});
    // 공개된 Three.js 엔진으로 경제 건물 메시를 직접 생성해 모델 고유성 검사.
    const buildingModels=await cozy.evaluate(async()=>{
      const {IslandRendererV3,ECONOMY_3D_LOOK}=await import('./render-v3.js');
      const renderer=Object.create(IslandRendererV3.prototype);
      const models=Object.entries(ECONOMY_3D_LOOK).map(([id,kind])=>{
        const model=renderer.make3d(kind,3.05);
        const signature=JSON.stringify(model.children.map(mesh=>[
          mesh.geometry?.type,mesh.geometry?.parameters,
          mesh.position.toArray().map(v=>Math.round(v*100)/100),
          mesh.material?.color?.getHex(),
          Math.round((mesh.rotation.z||0)*100)/100
        ]));
        const parts=model.children.length;
        model.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});
        return {id,signature,parts};
      });
      const barracks=renderer.make3d('fort-barracks',3.05);
      const training=barracks.children.length;
      barracks.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});
      return {
        count:models.length,unique:new Set(models.map(m=>m.signature)).size,
        empty:models.filter(m=>m.parts<4).map(m=>m.id),
        incomplete:['lumber','quarry','wheat','vineyard','winery','brewery','smith','stockpile']
          .filter(id=>!models.some(m=>m.id===id&&m.parts>=8)),
        training
      };
    });
    assert.equal(buildingModels.count,23,view.name+': COZY_BUILDING_TYPES');
    assert.equal(buildingModels.unique,23,view.name+': COZY_BUILDING_MODEL_DUPLICATION');
    assert.deepEqual(buildingModels.empty,[],view.name+': COZY_BUILDING_EMPTY_3D');
    assert.deepEqual(buildingModels.incomplete,[],view.name+': COZY_PRODUCTION_MESH_INCOMPLETE');
    assert.ok(buildingModels.training>=24,view.name+': COZY_BARRACKS_TRAINING_YARD');
    console.log('COZY_BUILDING_3D_POSTDEPLOY=PASS '+view.name+' '+expected);
    assert.equal(await cozy.locator('#joystick').count(),0,
      view.name+': COZY_RTS_MUST_NOT_HAVE_CHARACTER_JOYSTICK');
    await cozy.locator('#castleCommand').click();
    assert.match(await cozy.locator('#panelTitle').textContent(),/건설/,
      view.name+': COZY_RTS_BUILD_MENU_DOES_NOT_OPEN');
    assert.equal(await cozy.locator('[data-realm-tab]').count(),6,
      view.name+': COZY_RTS_BUILDING_CATEGORIES_INCOMPLETE');
    assert.ok((await cozy.locator('[data-build-economy]').count())>=4,
      view.name+': COZY_RTS_INDUSTRY_BUILDING_CARDS_MISSING');
    await cozy.locator('[data-realm-tab="wine"]').click();
    assert.equal(await cozy.locator('[data-build-economy="vineyard"]').count(),1,
      view.name+': COZY_RTS_VINEYARD_MISSING');
    assert.equal(await cozy.locator('[data-build-economy="winery"]').count(),1,
      view.name+': COZY_RTS_WINERY_MISSING');
    await cozy.locator('[data-realm-tab="military"]').click();
    assert.equal(await cozy.locator('.realm-tech-step').count(),8,
      view.name+': COZY_ECONOMY_MILITARY_TECH_TREE_MISSING');
    await cozy.locator('[data-realm-tab="defense"]').click();
    assert.equal(await cozy.locator('[data-build-fort]').count(),9,
      view.name+': COZY_NINE_FORT_TRAP_AND_WALL_CARDS_MISSING');
    assert.equal(await cozy.locator('.realm-tech-step').count(),3,
      view.name+': COZY_ECONOMY_TRAP_TECH_TREE_MISSING');
    // 실물 경제 건물이 없는 상태에서는 고급 병력·함정을 모집하거나 배치할 수 없다.
    const tech=await cozy.evaluate(async()=>{
      const {economyTechStatus,ECONOMY_BUILDINGS}=await import('./production-buildings.js');
      const economyV4={version:1,buildings:{}};
      const baseline={economyV4,inventory:{wood:20,stone:20,food:20},coins:100};
      const locked=economyTechStatus(baseline,'trebuchet');
      const basic=economyTechStatus(baseline,'soldier');
      for(const def of ECONOMY_BUILDINGS)economyV4.buildings[def.id]={
        count:1,level:3,sites:[{x:def.x,y:def.y}]};
      const advanced=economyTechStatus(baseline,'trebuchet');
      const trap=economyTechStatus(baseline,'barrel');
      const knight=economyTechStatus(baseline,'knight');
      delete economyV4.buildings.knightHall;
      const knightWithoutGuild=economyTechStatus(baseline,'knight');
      return {locked:locked.unlocked,basic:basic.unlocked,advanced:advanced.unlocked,
        trap:trap.unlocked,knight:knight.unlocked,knightWithoutGuild:knightWithoutGuild.unlocked,
        armyTypes:Object.keys(window.cozyRTS?.unitTypes||{}).length};
    });
    assert.equal(tech.locked,false,view.name+': COZY_TECH_UNLOCKED_TOO_EARLY');
    assert.equal(tech.basic,true,view.name+': COZY_BASIC_SOLDIER_REGRESSION');
    assert.equal(tech.advanced,true,view.name+': COZY_SIEGE_TECH_NEVER_UNLOCKS');
    assert.equal(tech.trap,true,view.name+': COZY_TRAP_TECH_NEVER_UNLOCKS');
    assert.equal(tech.armyTypes,10,view.name+': COZY_ARMY_ROLE_COUNT');
    assert.equal(tech.knight,true,view.name+': COZY_KNIGHT_UNLOCK_INCOMPLETE');
    assert.equal(tech.knightWithoutGuild,false,view.name+': COZY_KNIGHT_GUILD_BYPASS');
    console.log('COZY_TECH_TREE_PROGRESSION=PASS '+view.name);
    await cozy.locator('#panelClose').click();
    await cozy.locator('#fishingCommand').click();
    assert.match(await cozy.locator('#panelTitle').textContent(),/전쟁/,
      view.name+': COZY_RTS_WAR_MENU_DOES_NOT_OPEN');
    assert.equal(await cozy.locator('.realm-lord').count(),3,
      view.name+': COZY_RTS_THREE_ENEMY_LORDS_MISSING');
    assert.equal(await cozy.locator('[data-army-order]').count(),4,
      view.name+': COZY_RTS_TACTICAL_ORDERS_MISSING');
    await cozy.locator('#panelClose').click();
    assert.ok(await cozy.locator('#zoomIn').isVisible(),view.name+': COZY_RTS_ZOOM_MISSING');
    await cozy.locator('#systemCommand').click();
    assert.equal(await cozy.locator('[data-action="home"]').count(),1,
      view.name+': COZY_SYSTEM_HOME_MISSING');
    assert.equal(await cozy.locator('[data-action="resume"]').count(),1,
      view.name+': COZY_SYSTEM_RESUME_MISSING');
    assert.equal(await cozy.locator('[data-action="restart"]').count(),1,
      view.name+': COZY_SYSTEM_RESTART_MISSING');
    await cozy.locator('[data-tab="sound"]').click();
    assert.equal(await cozy.locator('#ks-track option').count(),4,
      view.name+': COZY_FOUR_THEME_MUSIC_MISSING');
    await cozy.locator('#systemClose').click();
    // 배포 후 실제 게임 API에서 기사단 영입→스킬 상태→포로 몸값/거부/교환 검증.
    const courtFlow=await cozy.evaluate(async()=>{
      const api=window.cozyRTS,st=api.state,inv=st.inventory;
      const {ECONOMY_BUILDINGS}=await import('./production-buildings.js');
      for(const def of ECONOMY_BUILDINGS)st.economyV4.buildings[def.id]={
        count:1,level:3,sites:[{x:def.x,y:def.y}]};
      st.barracksBuilt=true;inv.food=500;inv.iron=500;inv.wood=500;inv.stone=500;st.coins=1000;
      const hired=api.hireKnight(),knights=st.army.filter(u=>u.kind==='knight');
      const skill=api.knightSkill(999999);
      const court=st.knightCourtV1,iron=inv.iron,before=st.coins;
      const gold=api.getLords().find(l=>l.id==='gold');gold.coins=999;
      court.prisoners.push({id:'qa-gold',lordId:'gold',heroName:'시험 포로',level:1,day:st.day,lastOfferDay:-1});
      const demanded=api.prisonAction('demand','qa-gold'),earned=st.coins-before;
      court.heldByRivals.push({id:'qa-held',lordId:'iron',heroName:'시험 기사',
        trait:'guardian',quality:2,level:3,xp:12,price:55,day:st.day,refused:false});
      const refused=api.prisonAction('refuse','qa-held');
      court.prisoners.push({id:'qa-iron',lordId:'iron',heroName:'교환 대상',
        level:2,day:st.day,lastOfferDay:-1});
      const swapped=api.prisonAction('exchange','qa-iron');
      return {hired:hired.ok,knightSaved:knights.some(k=>k.heroName&&k.trait),
        ironRemaining:iron,skillInvalid:skill?.ok===false,
        demanded:demanded.ok,earned,refused:refused.ok,swapped:swapped.ok,
        returned:st.army.some(k=>k.kind==='knight'&&k.heroName==='시험 기사'),
        capacity:api.courtCapacity()};
    });
    assert.equal(courtFlow.hired,true,view.name+': COZY_KNIGHT_HIRE_FAILED');
    assert.equal(courtFlow.knightSaved,true,view.name+': COZY_KNIGHT_SAVE_FIELDS');
    assert.ok(courtFlow.ironRemaining<500,view.name+': COZY_KNIGHT_IRON_COST_IGNORED');
    assert.equal(courtFlow.skillInvalid,true,view.name+': COZY_KNIGHT_SKILL_VALIDATION');
    assert.equal(courtFlow.demanded,true,view.name+': COZY_PRISON_RANSOM_FAILED');
    assert.ok(courtFlow.earned>0,view.name+': COZY_PRISON_RANSOM_NO_GOLD');
    assert.equal(courtFlow.refused,true,view.name+': COZY_PRISON_REFUSAL_FAILED');
    assert.equal(courtFlow.swapped,true,view.name+': COZY_PRISON_EXCHANGE_FAILED');
    assert.equal(courtFlow.returned,true,view.name+': COZY_PRISON_KNIGHT_NOT_RETURNED');
    assert.ok(courtFlow.capacity>=4,view.name+': COZY_PRISON_NOT_BUILT');
    console.log('COZY_KNIGHT_PRISON_ECONOMY_RUNTIME=PASS '+view.name);
    assert.deepEqual(errors,[],view.name+': COZY_RTS_RUNTIME_ERRORS');
    console.log('COZY_RTS_PUBLIC_3D_ECONOMY_SIEGE_PASS '+view.name+' '+expected);
   }finally{await cozy.close()}
  }
 }
 // Owner-required: only real published, rendered WebGL 3D counts as wild-survival 3D.
 // A live 200 for index.html or a valid model preview does NOT prove gameplay is 3D.
 if(liveBase){
   const moduleUrl=liveBase+'web-games/wild-survival/wild3d.mjs';
   const moduleResponse=await page.request.get(moduleUrl,{timeout:15000});
   assert.equal(moduleResponse.status(),200,'WILD_SURVIVAL_3D_MODULE_NOT_LIVE: '+moduleUrl);
   const moduleText=await moduleResponse.text();
   assert.match(moduleText,/new THREE\.WebGLRenderer\s*\(/,'WILD_SURVIVAL_RENDERER_NOT_3D');
   assert.doesNotMatch(moduleText,/getContext\s*\(\s*['"]2d['"]/,'WILD_SURVIVAL_2D_FORBIDDEN');
   const game=await browser.newPage({viewport:{width:1100,height:720}});
   const gameExceptions=[];
   game.on('pageerror',err=>gameExceptions.push(err.message));
   const response=await game.goto(liveBase+'web-games/wild-survival/',{waitUntil:'domcontentloaded',timeout:25000});
   assert.equal(response?.status(),200,'WILD_SURVIVAL_LIVE_PAGE_NOT_200');
   await game.waitForFunction(()=>{
     const canvas=document.querySelector('#game');
     return document.body.dataset.spatialDimension==='3d'
       && document.body.dataset.renderer==='three-webgl'
       && canvas?.dataset.renderedFrame==='true';
   },null,{timeout:18000});
   const evidence=await game.evaluate(()=>{
     const canvas=document.querySelector('#game');
     const gl=canvas?.getContext('webgl2');
     const fake2d=canvas?.getContext('2d');
     return {
       webgl2:!!gl&&gl instanceof WebGL2RenderingContext,
       canvas2d:!!fake2d,
       pixels:canvas?.width*canvas?.height,
       errorVisible:!document.querySelector('#renderStatus')?.hidden,
       x:Number(document.body.dataset.playerWorldX),
       y:Number(document.body.dataset.playerWorldY)
     };
   });
   assert.equal(evidence.webgl2,true,'WILD_SURVIVAL_ACTUAL_WEBGL2_CONTEXT_REQUIRED');
   assert.equal(evidence.canvas2d,false,'WILD_SURVIVAL_2D_CANVAS_FORBIDDEN');
   assert.ok(evidence.pixels>=100000,'WILD_SURVIVAL_3D_SURFACE_EMPTY');
   assert.equal(evidence.errorVisible,false,'WILD_SURVIVAL_3D_ERROR_DISPLAYED');
   assert.ok(Number.isFinite(evidence.x)&&Number.isFinite(evidence.y),'WILD_SURVIVAL_PLAYER_STATE_MISSING');
   await game.locator('#begin').click();
   assert.equal(await game.locator('#start').evaluate(el=>el.classList.contains('hide')),true,
     'WILD_SURVIVAL_GAMEPLAY_START_FAILED');
   await game.keyboard.down('ArrowRight');
   await game.waitForTimeout(500);
   await game.keyboard.up('ArrowRight');
   const movedX=Number(await game.locator('body').getAttribute('data-player-world-x'));
   assert.ok(Number.isFinite(movedX)&&movedX>evidence.x+10,
     'WILD_SURVIVAL_3D_PLAYER_MOVEMENT_NOT_REFLECTED');
   await game.locator('#interact').click();
   await game.locator('#menuBtn').click();
   assert.equal(await game.locator('#craft').evaluate(el=>el.classList.contains('open')),true,
     'WILD_SURVIVAL_CRAFT_UI_BROKEN');
   assert.equal(await game.locator('body').getAttribute('data-spatial-dimension'),'3d');
   assert.deepEqual(gameExceptions,[],'WILD_SURVIVAL_UNCAUGHT_PAGE_ERRORS');
   console.log('WILD_SURVIVAL_LIVE_WEBGL_3D_AND_MOVEMENT=PASS');
   await game.close();
 }
 console.log('VIBE_BROWSER_SMOKE_PASS');
}finally{await browser?.close();server?.kill()}
