// 파일명: qa/vibe2-complex-codegen-browser.test.mjs
// [임포트] 기존 게임의 승인 범위 인메모리 후보를 실제 모바일 브라우저로 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {createVibe59CodeCandidates} from '../tools/vibe2-v59-autonomy.mjs';
import {applyExactEdits} from '../tools/autonomous-safe-edit.mjs';

test('source-grounded line-defense game candidate plays under real mobile Chromium without changing live source',async()=>{
  const modulePath=process.env.VIBE2_PLAYWRIGHT_MODULE;
  assert.ok(modulePath&&fs.existsSync(modulePath),'INDEPENDENT_CHROMIUM_EXECUTOR_REQUIRED');
  const {chromium}=await import(pathToFileURL(modulePath).href);
  const root=path.resolve('web-games/line-defense'),relative='index.html';
  const original=fs.readFileSync(path.join(root,relative),'utf8');
  // A deterministic test-only owner fixture. Never promote it to a live owner order.
  const order={selectedTask:{gameId:'line-defense',ownerDirective:true,
    goal:'When function buttons runs, call updateMeta then hud'}};
  const candidate=createVibe59CodeCandidates({order,sourceRoot:root,
    responsibleFiles:[relative],target:'web'});
  assert.equal(candidate.vibe59CodeKind,'SOURCE_BOUND_COMPLEX_CHAIN');
  assert.equal(candidate.modelUsed,false);
  assert.equal(candidate.sourceWrite,false);
  assert.equal(candidate.runtimeVerified,false);
  const documents=new Map([[relative,original]]);
  applyExactEdits(root,candidate.edits,{documents});
  const patched=documents.get(relative);
  assert.notEqual(patched,original);
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),original);
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
    const context=await browser.newContext({viewport:{width:390,height:844},
      hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    assert.equal(await page.title(),'고양이 전선');
    await page.locator('#openMain').tap();
    await page.waitForFunction(()=>!document.querySelector('#startOverlay').hidden);
    await page.evaluate(()=>{document.querySelector('#startGold').textContent='STALE_UI'});
    await page.locator('#start').tap();
    await page.waitForFunction(()=>!document.querySelector('#battleBar').hidden);
    const refreshed=await page.locator('#startGold').textContent();
    assert.ok(refreshed&&!refreshed.includes('STALE_UI'),'new source-linked UI update must execute');
    assert.ok(await page.locator('#unitBar button.unit').count()>0);
    await page.locator('#unitBar button.unit').first().tap();
    await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('출격'));
    const keysBefore=await page.evaluate(()=>Object.keys(localStorage).sort());
    await page.reload();
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),keysBefore,
      'save keys must be preserved after refresh');
    assert.deepEqual(errors,[],'uncaught runtime exceptions are forbidden');
    await context.close();
    console.log('VIBE2_COMPLEX_REAL_GAME_MOBILE_BROWSER=PASS');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
