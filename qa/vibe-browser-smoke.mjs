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
    for(const stage of ['cavern','garden','forge']){
     const route=await gem.goto(liveBase+'web-games/gem-survivor/',{waitUntil:'domcontentloaded'});
     assert.ok(route?.ok(),'GEM_ROUTE_HTTP');
     await gem.locator('#startBtn').waitFor({state:'visible'});
     await gem.waitForFunction(()=>!document.getElementById('startBtn').disabled,null,{timeout:60000});
     await gem.locator('button[data-stage="'+stage+'"]').click();
     assert.equal(await gem.locator('button[data-stage="'+stage+'"]').getAttribute('aria-pressed'),'true');
     await gem.locator('#startBtn').click();
     await gem.waitForFunction(id=>document.getElementById('game').dataset.stage===id,stage);
     const canvas=gem.locator('#game');
     assert.equal(await canvas.getAttribute('data-world-width'),'4200');
     assert.equal(await canvas.getAttribute('data-world-height'),'3200');
     assert.equal(await canvas.getAttribute('data-authored-monster-kinds'),'8');
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
     assert.equal(await canvas.getAttribute('data-rendered-frame'),'true');
     assert.equal(await canvas.getAttribute('data-fallback-enemy-assets'),'0');
     assert.deepEqual(gemErrors,[],'GEM_RUNTIME_ERRORS');
     console.log('GEM_SURVIVOR_PUBLIC_PLAY_PASS '+JSON.stringify({sourceSha:process.env.GITHUB_SHA,mobile,stage,first,moved}));
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
    assert.equal(await equippedIcons.count(),4,
      viewport.name+': the four character equipment slots must show image icons');
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
 // 포근섬: 기존 캐릭터 조작이 아닌 스트롱홀드 전략 화면과 공개판 저장을 확인한다.
 // 동일 게시 소스 SHA, 데스크톱/모바일 WebGL, 성채/병영/무역, 카메라 입력, 영지 저장 검증.
 if(liveBase){
  const requiredRevision=String(process.env.GITHUB_SHA||'').trim();
  assert.match(requiredRevision,/^[0-9a-f]{40}$/i,'COZY_ISLAND_DEPLOY_REVISION_REQUIRED');
  const liveManifest=await page.request.get(liveBase+'web-games/publish-manifest.json');
  assert.ok(liveManifest.ok(),'COZY_ISLAND_MANIFEST_NOT_LIVE');
  const manifest=await liveManifest.json();
  assert.equal(manifest.sourceSha,requiredRevision,'COZY_ISLAND_DEPLOY_SOURCE_MISMATCH');
  assert.ok(manifest.routes.includes('web-games/cozy-island/'),'COZY_ISLAND_PUBLISHED_ROUTE_MISSING');
  for(const view of [{name:'desktop',width:1100,height:720,mobile:false},
                     {name:'mobile',width:390,height:844,mobile:true}]){
   const cozy=await browser.newPage({viewport:{width:view.width,height:view.height},
    isMobile:view.mobile,hasTouch:view.mobile});
   const errors=[];
   cozy.on('pageerror',err=>errors.push(err.message));
   try{
    const response=await cozy.goto(liveBase+'web-games/cozy-island/',
      {waitUntil:'domcontentloaded',timeout:30000});
    assert.ok(response?.ok(),view.name+': COZY_ISLAND_ROUTE_NOT_LIVE');
    const rendererReady=()=>{
     const input=document.querySelector('#game');
     const canvas=document.querySelector('#island3d');
     const status=document.querySelector('#webglStatus');
     if(!input||!canvas||!status||!status.hidden)return false;
     const gl=canvas.getContext('webgl2');
     return input.width===1&&input.height===1
       && getComputedStyle(input).opacity==='0'
       && canvas.width>250&&canvas.height>250
       && !!gl&&gl.getParameter(gl.VIEWPORT)[2]>250;
    };
    await cozy.waitForFunction(rendererReady,null,{timeout:25000});
    assert.equal(await cozy.locator('#island3d').evaluate(c=>!!c.getContext('webgl2')),true,
     view.name+': COZY_ISLAND_3D_RENDERER_NOT_READY');
    assert.equal(await cozy.locator('#joystick,#levelUpButtonV13,#toolButton').count(),0,
     view.name+': COZY_LEGACY_CHARACTER_UI_PRESENT');
    assert.equal(await cozy.locator('#actionButton').evaluate(el=>el.hidden),true,
     view.name+': COZY_OLD_ACTION_BUTTON_VISIBLE');
    await cozy.locator('#inventoryButton').click();
    assert.equal(await cozy.locator('#panelTitle').textContent(),'가방',
     view.name+': COZY_RESOURCE_PANEL_FAILED');
    await cozy.locator('#panelClose').click();
    await cozy.locator('#helpCommand').click();
    assert.equal(await cozy.locator('#panelTitle').textContent(),'영지 운영 안내',
     view.name+': COZY_STRATEGY_HELP_FAILED');
    await cozy.locator('#panelClose').click();
    const controlsHit=await cozy.locator('#castleCommand').evaluate(button=>{
     const bar=button.closest('.strategy-bar'),rect=button.getBoundingClientRect();
     const target=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
     return !!bar&&bar.closest('.controls')!==null
      &&getComputedStyle(button).pointerEvents!=='none'
      &&(target===button||button.contains(target));
    });
    assert.equal(controlsHit,true,view.name+': COZY_STRATEGY_POINTER_BLOCKED');
    const row=await cozy.locator('.strategy-bar').evaluate(bar=>{
     const first=bar.querySelector('#castleCommand').getBoundingClientRect();
     const last=bar.querySelector('#centerCommand').getBoundingClientRect();
     return getComputedStyle(bar).display==='grid'
      &&first.left<last.left&&Math.abs(first.top-last.top)<12;
    });
    assert.equal(row,true,view.name+': COZY_STRATEGY_COMMAND_BAR_NOT_HORIZONTAL');
    await cozy.locator('#castleCommand').click();
    assert.equal(await cozy.locator('#panelTitle').textContent(),'성채 · 병력 · 무역 관리',
     view.name+': COZY_CASTLE_COMMAND_FAILED');
    for(const type of ['hall','tower','lumber','mine'])
     assert.equal(await cozy.locator('[data-castle="build:'+type+'"]').count(),1,
      view.name+': COZY_BUILD_OPTION_MISSING_'+type);
    await cozy.locator('#panelClose').click();
    await cozy.locator('#barracksCommand').click();
    assert.ok((await cozy.locator('#panelTitle').textContent()).startsWith('병영'),
     view.name+': COZY_BARRACKS_COMMAND_FAILED');
    await cozy.locator('#panelClose').click();
    await cozy.locator('#tradeCommand').click();
    assert.equal(await cozy.locator('#panelTitle').textContent(),'⚓ 무역 · 경제',
     view.name+': COZY_TRADE_PANEL_FAILED');
    assert.equal(await cozy.locator('.market-item').count(),6,
     view.name+': COZY_TRADE_GOODS_MISSING');
    const goldBefore=Number(await cozy.locator('#coinText').textContent());
    await cozy.locator('[data-castle="trade:buy:wood"]').click();
    await cozy.waitForFunction(gold=>Number(document.querySelector('#coinText').textContent)<gold,
     goldBefore,{timeout:10000});
    const coinsAfter=Number(await cozy.locator('#coinText').textContent());
    assert.ok(coinsAfter<goldBefore,view.name+': COZY_TRADE_NOT_APPLIED');
    await cozy.waitForFunction(expected=>{
     try{return Number(JSON.parse(localStorage.getItem('jaewoon-games:cozy-island')||'null')?.progress?.coins)===expected}
     catch{return false}
    },coinsAfter,{timeout:10000});
    await cozy.locator('#panelClose').click();
    assert.equal(await cozy.locator('#zoomIn').isVisible(),true,
     view.name+': COZY_ZOOM_CONTROL_MISSING');
    await cozy.locator('#zoomIn').click();
    await cozy.locator('#zoomOut').click();
    await cozy.locator('#centerCommand').click();
    const bounds=await cozy.locator('#game').boundingBox();
    assert.ok(bounds,view.name+': COZY_MAP_INPUT_SURFACE_MISSING');
    // 같은 지도 입력 표면에서 마우스/터치 이동으로 전략 카메라가 입력을 받는지 확인.
    const cx=bounds.x+bounds.width*.48,cy=bounds.y+bounds.height*.48;
    await cozy.mouse.move(cx,cy);
    await cozy.mouse.down();
    await cozy.mouse.move(cx+62,cy+45,{steps:5});
    await cozy.mouse.up();
    await cozy.reload({waitUntil:'domcontentloaded',timeout:30000});
    await cozy.waitForFunction(rendererReady,null,{timeout:25000});
    await cozy.waitForFunction(expected=>
      Number(document.querySelector('#coinText')?.textContent)===expected,
      coinsAfter,{timeout:10000});
    assert.equal(await cozy.locator('#joystick,#levelUpButtonV13').count(),0,
     view.name+': COZY_LEGACY_UI_RETURNED_AFTER_RELOAD');
    assert.deepEqual(errors,[],view.name+': COZY_ISLAND_UNCAUGHT_PAGE_ERRORS');
    console.log('COZY_ISLAND_STRATEGY_POST_DEPLOY=PASS '+view.name+' '+JSON.stringify({
     sourceSha:requiredRevision,coinsBefore:goldBefore,coinsAfter
    }));
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
