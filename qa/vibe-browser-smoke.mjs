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
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
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
 console.log('VIBE_BROWSER_SMOKE_PASS');
}finally{await browser?.close();server?.kill()}
