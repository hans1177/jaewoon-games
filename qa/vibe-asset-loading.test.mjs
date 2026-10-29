// 파일명: qa/vibe-asset-loading.test.mjs
// [임포트] 기존 공통 런타임/작업실 실행 경로 직접 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import {JaewoonVibeRuntime} from '../assets/vibe-runtime.js';
import {JaewoonVibeWorkspace} from '../assets/vibe-workspace.js';
import {createVibeWebRuntimeBundle} from '../assets/vibe-web-runtime-runner.js';

// [메인] GitHub Pages 하위 배포 경로, 병렬 큐, 동일 에셋 캐시와 해제
test('asset loader resolves GitHub Pages project root, emits progress, shares cache and releases references',async()=>{
 const original={fetch:globalThis.fetch,Image:globalThis.Image};
 const calls=[];
 let imageCount=0;
 globalThis.fetch=async url=>{calls.push(String(url));return new Response('{"ok":true}',{status:200,headers:{'content-type':'application/json'}})};
 globalThis.Image=class {
  constructor(){imageCount++}
  set src(url){this._src=url;if(url)queueMicrotask(()=>this.onload?.())}
  get src(){return this._src}
 };
 try{
  const game=new JaewoonVibeRuntime({gameId:'qa-asset-test',assetBaseUrl:'https://hans1177.github.io/jaewoon-games/'});
  assert.equal(game.resolveAssetUrl('/assets/hero.png'),'https://hans1177.github.io/jaewoon-games/assets/hero.png');
  assert.equal(game.resolveAssetUrl('/jaewoon-games/assets/hero.png'),'https://hans1177.github.io/jaewoon-games/assets/hero.png');
  assert.throws(()=>game.resolveAssetUrl('/../../escape.png'),/escapes project root/);
  assert.equal(game.resolveAssetUrl('web-games/demo/../hero.png'),'https://hans1177.github.io/jaewoon-games/web-games/hero.png');
  assert.throws(()=>game.resolveAssetUrl('javascript:alert(1)'),/unsafe asset URL/);
  const progress=[],complete=[];
  const first=await game.loadAssets([{id:'hero',path:'assets/hero.png'},{id:'config',path:'assets/data.json'}],
   {concurrency:2,onProgress:e=>progress.push(e.progress),onComplete:e=>complete.push(e)});
  assert.equal(first.ok,true);
  assert.deepEqual(first.assets.config,{ok:true});
  assert.equal(first.assets.hero instanceof Image,true);
  assert.deepEqual(progress,[0,0.5,1]);
  assert.equal(complete.length,1);
  assert.equal(complete[0].ok,true);
  const second=await game.loadAssets([{id:'same',path:'assets/hero.png'}]);
  assert.equal(first.assets.hero,second.assets.same);
  assert.equal(imageCount,1);
  assert.equal(calls.length,1);
  first.release();
  assert.equal(game.assetCache.size,1);
  second.release();
  assert.equal(game.assetCache.size,0);
  second.release();
  game.destroy();
 }finally{globalThis.fetch=original.fetch;globalThis.Image=original.Image}
});

test('asset loader rejects missing resources, clears failed cache and reports completion',async()=>{
 const fetchBefore=globalThis.fetch;
 globalThis.fetch=async()=>new Response('missing',{status:404});
 try{
  const game=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/game/'});
  const end=[];
  await assert.rejects(game.loadAssets([{id:'missing',path:'bad.json'}],{onComplete:v=>end.push(v)}),AggregateError);
  assert.equal(end[0].failed,1);
  assert.equal(end[0].ok,false);
  assert.equal(game.assetCache.size,0);
  game.destroy();
 }finally{globalThis.fetch=fetchBefore}
});

// [작업실] 바이너리 경로는 읽기 전용·상위 경로 차단
test('workspace binary asset reader handles exact bytes and denies path traversal',async()=>{
 const bytes=new Uint8Array([0,1,2,254]);
 const workspace=new JaewoonVibeWorkspace({rootHandle:{async getFileHandle(name){
  assert.equal(name,'hero.png');
  return {async getFile(){return {size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer}}};
 }}});
 assert.deepEqual(new Uint8Array(await workspace.readBinary('hero.png')),bytes);
 await assert.rejects(workspace.readBinary('../hero.png'),/invalid workspace asset path/);
});

// [웹 미리보기] 미디어·폰트·CSS url·중복 파일을 단일 object URL에 연결
test('canonical browser bundle rewrites local images, audio, fonts, CSS and scripts',async()=>{
 const files={
  'pages/index.html':'<link rel="stylesheet" href="../styles/site.css"><link rel="icon" href="../media/icon.png"><style>main{background:url("../media/hero.png")}@font-face{font-family:game;src:url("../media/game.woff2")}</style><img src="../media/hero.png"><audio src="../media/sound.ogg"></audio><script src="../scripts/game.js"></script>',
  'styles/site.css':'@font-face{font-family:game;src:url("../media/game.woff2")}body{background:url("../media/hero.png")}',
  'scripts/game.js':'window.loaded=true;',
  'media/hero.png':new Uint8Array([137,80,78,71]),
  'media/sound.ogg':new Uint8Array([79,103,103,83]),
  'media/icon.png':new Uint8Array([137,80,78,71]),
  'media/game.woff2':new Uint8Array([119,79,70,50])
 };
 const reads=[];
 const workspace={
  summary:()=>({files:Object.keys(files).map(path=>({path}))}),
  read:async path=>{reads.push(path);return files[path]},
  readBinary:async path=>{reads.push(path);return files[path].buffer}
 };
 const bundle=await createVibeWebRuntimeBundle(workspace,{entry:'pages/index.html'});
 try{
  assert.equal(bundle.version,2);
  assert.equal(bundle.resourceCount,6);
  assert.equal((bundle.html.match(/blob:/g)||[]).length,7);
  assert.ok(bundle.html.includes('<img src="blob:'));
  assert.ok(bundle.html.includes('<audio src="blob:'));
  assert.ok(bundle.html.includes('<script src="blob:'));
  assert.ok(bundle.html.includes('<link rel="icon" href="blob:'));
  assert.match(bundle.html,/<style>main\{background:url\("blob:[^"]+"\)\}@font-face/);

  assert.equal(reads.filter(path=>path==='media/hero.png').length,1);
 }finally{bundle.revoke();bundle.revoke()}
});

test('canonical bundle rejects escaped workspace paths and unsupported module scripts',async()=>{
 const workspace={
  summary:()=>({files:[{path:'index.html'},{path:'main.mjs'}]}),
  read:async path=>path==='index.html'?'<img src="../escape.png">':'console.log(1)',
  readBinary:async()=>new Uint8Array().buffer
 };
 await assert.rejects(createVibeWebRuntimeBundle(workspace),/outside workspace/);
 workspace.read=async path=>path==='index.html'?'<script type="module" src="main.mjs"></script>':'console.log(1)';
 await assert.rejects(createVibeWebRuntimeBundle(workspace),/unsupported local resources/);
});
