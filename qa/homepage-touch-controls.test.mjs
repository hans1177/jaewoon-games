import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const touch=fs.readFileSync('web-games/_shared/touch-controls.js','utf8');
test('homepage uses touch/click direct launch without keyboard launch wiring',()=>{assert.match(homepage,/dataset\.touchLaunch='true'/);assert.match(homepage,/window\.location\.href=target/);assert.doesNotMatch(homepage,/addEventListener\('keydown'/);assert.doesNotMatch(homepage,/tabindex="0"/);});
test('all Web HTML routes receive touch controls',()=>{assert.match(worker,/url\.pathname\.startsWith\('\/web-games\/'\)/);assert.match(worker,/\/web-games\/_shared\/touch-controls\.js/);assert.match(worker,/injectUniversalTouchControls/);});
test('homepage mobile layout keeps readable single-column cards and large touch targets',()=>{
  assert.match(homepage,/@media\(max-width:700px\)/);
  assert.match(homepage,/\.gameShelfGrid\{grid-template-columns:1fr/);
  assert.match(homepage,/\.foldGameBtn\{min-height:46px/);
  assert.match(homepage,/\.homeFocusBtn\{width:100%;min-height:48px/);
  assert.match(homepage,/@media\(max-width:420px\)/);
  assert.match(homepage,/\.foldGameActions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(homepage,/\.foldGameBtn\.platformAction\{grid-column:1\/-1\}/);
});
test('touch layer provides joystick only while skipping native sticks',()=>{assert.match(touch,/#joy/);assert.match(touch,/#joystick/);assert.match(touch,/jaewoon:joystick/);assert.doesNotMatch(touch,/jg-action-a/);assert.doesNotMatch(touch,/jg-action-b/);assert.doesNotMatch(touch,/>A<|>B</);assert.match(touch,/pointerdown/);assert.match(touch,/pointermove/);});

test('Unity WebGL keeps its native touch interface without injecting the legacy joystick',async()=>{
  const edge=await import('data:text/javascript;base64,'+Buffer.from(worker).toString('base64'));
  const html='<html><body><canvas id="unity-canvas"></canvas><script src="Build/game.loader.js"></script><script>createUnityInstance(canvas,config)</script></body></html>';
  const env={ASSETS:{fetch:async request=>new URL(request.url).pathname==='/game-catalog.json'
    ?Response.json({games:[],webExposurePolicy:{enabled:false}})
    :new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}})}};
  const response=await edge.default.fetch(new Request('https://example.test/web-games/test-unity/'),env);
  assert.equal(response.status,200);
  assert.equal(await response.text(),html);
});
