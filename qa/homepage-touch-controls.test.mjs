// 파일명: qa/homepage-touch-controls.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync } from 'node:zlib';
const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const touch=fs.readFileSync('web-games/_shared/touch-controls.js','utf8');
test('homepage uses touch/click direct launch without keyboard launch wiring',()=>{assert.match(homepage,/dataset\.touchLaunch='true'/);assert.match(homepage,/window\.location\.href=target/);assert.doesNotMatch(homepage,/addEventListener\('keydown'/);assert.doesNotMatch(homepage,/<(?:a|button)\b[^>]*tabindex="0"[^>]*class="(?:homeFocusBtn|foldGameBtn)/);});
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

test('Unity WebGL compressed assets preserve bytes and declare correct response encoding',async()=>{
  const NativeResponse=globalThis.Response;
  globalThis.Response=class extends NativeResponse{
    constructor(body,init={}){super(body,init);this.encodeBody=init.encodeBody||'automatic';}
  };
  try{
  const edge=await import('data:text/javascript;base64,'+Buffer.from(worker).toString('base64'));
  const plain=Buffer.from('function unityRuntimeLoaded(){return 1;}');
  for(const [route,encoding,compress,decompress,contentType] of [
    ['daechung-rpg/unity/Build/daechung-rpg.framework.js.gz','gzip',gzipSync,gunzipSync,'application/javascript; charset=utf-8'],
    ['daechung-rpg/unity/Build/daechung-rpg.data.gz','gzip',gzipSync,gunzipSync,'application/octet-stream'],
    ['daechung-rpg/unity/Build/daechung-rpg.wasm.gz','gzip',gzipSync,gunzipSync,'application/wasm'],
    ['daechung-rpg/unity/Build/daechung-rpg.framework.js.br','br',brotliCompressSync,brotliDecompressSync,'application/javascript; charset=utf-8'],
    ['sample/Build/sample.data.br','br',brotliCompressSync,brotliDecompressSync,'application/octet-stream']
  ]){
    const bytes=compress(plain);
    const url='https://example.test/web-games/'+route;
    const env={ASSETS:{fetch:async()=>new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}})}};
    const res=await edge.default.fetch(new Request(url),env);
    assert.equal(res.headers.get('Content-Encoding'),encoding,route);
    assert.equal(res.headers.get('Content-Type'),contentType,route);
    assert.equal(res.headers.get('Cache-Control'),'no-cache, must-revalidate');
    const body=Buffer.from(await res.arrayBuffer());
    assert.deepEqual(body,bytes,'compressed bytes must not be modified');
    // Cloudflare가 자동 모드에서 수행하는 전송 압축까지 재현한다. 브라우저는 한 번만 해제한다.
    const wire=res.encodeBody==='manual'?body:compress(body);
    const browserBytes=decompress(wire);
    assert.deepEqual(browserBytes,plain,'browser must receive decoded runtime, never a second compressed layer');
    assert.equal(res.encodeBody,'manual');
  }
  const head=await edge.default.fetch(new Request('https://example.test/web-games/daechung-rpg/unity/Build/daechung-rpg.data.gz',{method:'HEAD'}),{
    ASSETS:{fetch:async()=>new Response(null,{headers:{'Content-Type':'application/octet-stream'}})}
  });
  assert.equal(head.headers.get('Content-Encoding'),'gzip');
  assert.equal(await head.text(),'');
  assert.equal(head.encodeBody,'manual');
  }finally{globalThis.Response=NativeResponse;}
});

test('Cloudflare Pages header patterns use one splat and include Unity compressed assets',()=>{
  const lines=fs.readFileSync('_headers','utf8').split(/\r?\n/);
  const rules=lines.filter(line=>line.startsWith('/'));
  assert.ok(rules.every(rule=>(rule.match(/\*/g)||[]).length<=1));
  for(const suffix of ['framework.js.gz','data.gz','wasm.gz','framework.js.br','data.br','wasm.br']){
    const pattern='/web-games/*.'+suffix;
    const start=lines.indexOf(pattern);
    assert.ok(start>=0,pattern);
    assert.equal(lines[start+2].trim(),'Content-Encoding: '+(suffix.endsWith('.gz')?'gzip':'br'));
    assert.equal(lines[start+3].trim(),'Cache-Control: no-cache, must-revalidate');
  }
});
