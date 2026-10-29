// 파일명: qa/vibe2-complex-codegen-browser.mjs
// [임포트] 실제 기존 게임 HTML의 인메모리 후보를 모바일 Chromium에서 실행한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {createVibe59CodeCandidates} from '../tools/vibe2-v59-autonomy.mjs';
import {applyExactEdits} from '../tools/autonomous-safe-edit.mjs';

const root=path.resolve('web-games/line-defense');
const relative='index.html';
const original=fs.readFileSync(path.join(root,relative),'utf8');
// This is a test-only explicit instruction. It is NOT an owner-approved live change.
const order={selectedTask:{gameId:'line-defense',ownerDirective:true,
  goal:'When function buttons runs, call updateMeta then hud'}};
const candidate=createVibe59CodeCandidates({order,sourceRoot:root,
  responsibleFiles:[relative],target:'web'});
assert.equal(candidate?.vibe59CodeKind,'SOURCE_BOUND_COMPLEX_CHAIN');
assert.equal(candidate.edits.length,1);
assert.equal(candidate.sourceWrite,false);
assert.equal(candidate.runtimeVerified,false);
const documents=new Map([[relative,original]]);
applyExactEdits(root,candidate.edits,{documents});
const patched=documents.get(relative);
assert.notEqual(patched,original,'real game source must receive an observable candidate diff');
assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),original,
  'test-only source must never write into live game repository');
const modulePath=process.env.VIBE2_PLAYWRIGHT_MODULE;
assert.ok(modulePath&&fs.existsSync(modulePath),
  'VIBE2_PLAYWRIGHT_MODULE_REQUIRED_FOR_REAL_BROWSER_QA');
const {chromium}=await import(pathToFileURL(modulePath).href);
const server=http.createServer((req,res)=>{
  if(req.url!=='/'){res.writeHead(404);res.end();return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
  res.end(patched);
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,
    hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  assert.equal(await page.title(),'고양이 전선');
  await page.locator('#openMain').tap();
  await page.waitForFunction(()=>!document.querySelector('#startOverlay').hidden);
  await page.evaluate(()=>{document.querySelector('#startGold').textContent='STALE_START_GOLD'});
  // start() invokes the original buttons() function. The generated calls should
  // update existing state UI without changing the game rule or the save key.
  await page.locator('#start').tap();
  await page.waitForFunction(()=>!document.querySelector('#battleBar').hidden);
  const gold=await page.locator('#startGold').textContent();
  assert.ok(gold&&!gold.includes('STALE_START_GOLD'), 'generated linked UI state must be rendered');
  const walletBefore=await page.locator('#money').textContent();
  const buttons=page.locator('#unitBar button.unit');
  assert.ok(await buttons.count()>0,'existing unit purchase buttons remain visible');
  await buttons.first().tap();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('출격'));
  const walletAfter=await page.locator('#money').textContent();
  assert.notEqual(walletAfter,walletBefore,'mobile touch summon must change gameplay wallet');
  const originalKeys=await page.evaluate(()=>Object.keys(localStorage).sort());
  await page.reload();
  const reloadKeys=await page.evaluate(()=>Object.keys(localStorage).sort());
  assert.deepEqual(reloadKeys,originalKeys,'existing save keys must survive reload unchanged');
  assert.deepEqual(errors,[],'browser runtime exceptions forbidden');
  await context.close();
  console.log('VIBE2_COMPLEX_REAL_GAME_BROWSER=PASS');
  console.log('VIBE2_COMPLEX_REAL_GAME_SOURCE_WRITE=false');
  console.log('VIBE2_COMPLEX_REAL_GAME_RUNTIME=CHROMIUM_MOBILE_PATCHED_CANDIDATE');
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
