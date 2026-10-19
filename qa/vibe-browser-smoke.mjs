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
