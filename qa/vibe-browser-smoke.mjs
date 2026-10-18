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
 const url='http://127.0.0.1:'+port+'/assets/vibe-model-preview.html?asset=assets/nonexistent.glb';
 let loaded=false;
 for(let i=0;i<30;i++){try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:2000});loaded=!!response;break}catch{await new Promise(r=>setTimeout(r,250))}}
 assert.ok(loaded,'Preview page did not load');
 await page.getByRole('button',{name:'타격 연출 테스트'}).click();
 await page.waitForTimeout(180);
 assert.equal(await page.getByRole('status').last().textContent(),'타격');
 const checkbox=page.getByRole('checkbox');
 await checkbox.check();
 await page.getByRole('button',{name:'타격 연출 테스트'}).click();
 assert.equal(await checkbox.isChecked(),true);
 assert.deepEqual(errors,[],'Uncaught browser exceptions');
 console.log('VIBE_BROWSER_SMOKE_PASS');
}finally{await browser?.close();server.kill()}
