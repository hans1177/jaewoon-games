// Browser smoke test: run with `node qa/vibe-browser-smoke.mjs` after `npx playwright install chromium`.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const port=Number(process.env.VIBE_SMOKE_PORT||8765);
const server=spawn('python3',['-m','http.server',String(port),'--directory',process.env.VIBE_SMOKE_ROOT||'_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1100,height:720}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const url='http://127.0.0.1:'+port+'/assets/vibe-model-preview.html';
 let loaded=false;
 for(let i=0;i<30;i++){try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:2000});loaded=!!response;break}catch{await new Promise(r=>setTimeout(r,250))}}
 assert.ok(loaded,'Preview page did not load');
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
    await game.waitForFunction(()=>document.body.dataset.spatialDimension==='3d',
     null,{timeout:60000});
    const metrics=await game.evaluate(()=>{
     const canvas=document.getElementById('world3d');
     const gl=canvas?.getContext('webgl2');
     const data=document.body.dataset;
     return {visible:!!canvas&&!canvas.hidden,
      width:canvas?.width||0,height:canvas?.height||0,
      webgl:gl?String(gl.getParameter(gl.VERSION)):'',
      mode:data.spatialDimension,coverage:data.nativeMonsterCoverage||'',
      playerX:Number(data.playerX),playerY:Number(data.playerY)};
    });
    assert.ok(metrics.visible&&metrics.width>150&&metrics.height>150,
     viewport.name+': WebGL canvas never became a real visible game frame');
    assert.match(metrics.webgl,/WebGL 2/i,viewport.name+': live game is not WebGL2');
    assert.equal(metrics.coverage,'currently-mapped',
     viewport.name+': an invisible original enemy may be present');
    assert.deepEqual(gameErrors,[],viewport.name+': uncaught browser errors before movement');
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
    console.log('MAGIC_FOREST_NATIVE_3D_LIVE_PASS '+viewport.name+' '+
     JSON.stringify({sourceSha:requiredRevision,metrics,savedPlayerX:restoredX}));
   }finally{await game.close()}
  }
 }
 console.log('VIBE_BROWSER_SMOKE_PASS');
}finally{await browser?.close();server.kill()}
