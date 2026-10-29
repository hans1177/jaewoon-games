// 파일명: qa/vibe-asset-loading.test.mjs
// [임포트] 기존 공통 런타임/작업실 실행 경로 직접 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import {JaewoonVibeRuntime} from '../assets/vibe-runtime.js';
import {JaewoonVibeWorkspace} from '../assets/vibe-workspace.js';
import {createVibeWebRuntimeBundle} from '../assets/vibe-web-runtime-runner.js';
import {buildGeneratedGame,normalizeGeneratedGameAssets} from '../assets/game-generator.js';
import {Script,createContext} from 'node:vm';
import {readFileSync} from 'node:fs';

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


test('generated game honors explicit assets and rejects unsafe or unsupported sources',()=>{
 const assets=normalizeGeneratedGameAssets({assets:{background:'/assets/authorized/bg.webp',player:'assets/player.png',enemy:'assets/enemy.webp',boss:'assets/boss.png',bgm:'audio/music.ogg'}});
 assert.equal(assets.length,5);
 assert.deepEqual(assets.map(x=>x.type),['image','image','image','image','audio']);
 assert.throws(()=>normalizeGeneratedGameAssets({assets:{player:'../private.png'}}),/invalid game asset path/);
 assert.throws(()=>normalizeGeneratedGameAssets({assets:{player:'javascript:alert(1).png'}}),/invalid game asset path/);
 assert.throws(()=>normalizeGeneratedGameAssets({assets:{player:'assets/fake.glb'}}),/unsupported game image/);
 assert.throws(()=>normalizeGeneratedGameAssets({assets:{bgm:'assets/icon.png'}}),/unsupported game audio/);
 assert.throws(()=>normalizeGeneratedGameAssets({assets:[{id:'player',path:'assets/a.png'},{id:'player',path:'assets/b.png'}]}),/duplicate game asset/);
 const basic=buildGeneratedGame({packageData:{gameId:'no-assets',content:{}}});
 assert.ok(basic.html.includes('const ASSET_MANIFEST=[];'));
 assert.ok(basic.html.includes("import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js'"));
 const configured=buildGeneratedGame({packageData:{gameId:'approved',assets:{player:'assets/player.png',bgm:'audio/music.ogg'}}});
 assert.ok(configured.html.includes('"path":"assets/player.png"'));
 assert.ok(configured.html.includes('"path":"audio/music.ogg"'));
 assert.ok(configured.html.includes('runtime.loadAssets(ASSET_MANIFEST'));
 assert.ok(configured.html.includes('loadedAssets.player'));
 assert.ok(configured.html.includes("runtime.registerAudio('generated-bgm'"));
 assert.ok(!configured.html.includes('javascript:alert(1)'));
});

test('generated game gates startup on asset loading and draws provided assets',async()=>{
 const html=buildGeneratedGame({packageData:{gameId:'qa-generated-assets',assets:{background:'assets/bg.png',player:'assets/player.png',enemy:'assets/enemy.png',bgm:'audio/bgm.ogg'}}}).html;
 const scriptSource=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(scriptSource,'generated module script exists');
 const body=scriptSource.replace(/^\s*import \{ JaewoonVibeRuntime \} from '[^']+';\s*/,'');
 let resolveAssets,loadedEntries,rafCount=0,frame=null,plays=0;
 const drawCalls=[],listeners=new Map();
 const canvasContext={clearRect(){},fillRect(){},fillText(){},beginPath(){},arc(){},fill(){},drawImage:(...args)=>drawCalls.push(args)};
 const elements=new Map();
 const getElementById=id=>{
   if(!elements.has(id)) elements.set(id,{textContent:'',style:{},onclick:null,addEventListener(){},setPointerCapture(){},getBoundingClientRect:()=>({width:140,left:0,top:0})});
   return elements.get(id);
 };
 const canvas=getElementById('game'); canvas.width=640; canvas.height=480;canvas.getContext=()=>canvasContext;
 const doc={getElementById,addEventListener:(event,fn)=>listeners.set(event,fn),removeEventListener:(event)=>listeners.delete(event)};
 class FakeRuntime{
   constructor(){this.paused=false}
   boot(){return this}
   loadProgress(){return null}
   loadAssets(entries,{onProgress}){loadedEntries=entries;onProgress({progress:0});return new Promise(resolve=>{resolveAssets=()=>{onProgress({progress:1});resolve({assets:{background:{kind:'bg'},player:{kind:'player'},enemy:{kind:'enemy'},bgm:{loop:false}},release(){}})}})}
   registerAudio(name,audio,kind){assert.equal(name,'generated-bgm');assert.equal(kind,'music');this.audio=audio}
   playAudio(name){assert.equal(name,'generated-bgm');plays++}
   destroy(){}
 }
 const context=createContext({JaewoonVibeRuntime:FakeRuntime,document:doc,window:{addEventListener(){}},performance:{now:()=>100},requestAnimationFrame(fn){rafCount++;frame=fn},setTimeout:()=>0,clearTimeout(){},console});
 new Script(body,{filename:'generated-game.js'}).runInContext(context);
 assert.equal(rafCount,0,'game loop must wait for loading');
 assert.equal(getElementById('status').textContent,'에셋 로딩 0%');
 assert.equal(loadedEntries.length,4);
 resolveAssets();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(getElementById('status').textContent,'플레이 중');
 assert.equal(rafCount,1);
 frame(116);
 assert.ok(drawCalls.some(row=>row[0].kind==='bg'),'provided background must be drawn');
 assert.ok(drawCalls.some(row=>row[0].kind==='player'),'provided player sprite must be drawn');
 assert.ok(drawCalls.some(row=>row[0].kind==='enemy'),'provided enemy sprite must be drawn');
 assert.equal(plays,0,'music must not autoplay before a user gesture');
 listeners.get('pointerdown')();
 assert.equal(plays,1,'user gesture starts approved music');
});

test('generated game reports missing asset failure instead of starting a broken scene',async()=>{
 const html=buildGeneratedGame({packageData:{gameId:'qa-missing',assets:{player:'assets/missing.png'}}}).html;
 const body=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^\s*import \{ JaewoonVibeRuntime \} from '[^']+';\s*/,'');
 let rejectAssets,rafCount=0;
 const ui=new Map();
 const getElementById=id=>{if(!ui.has(id))ui.set(id,{textContent:'',style:{},addEventListener(){},setPointerCapture(){},getBoundingClientRect:()=>({width:140,left:0,top:0})});return ui.get(id)};
 getElementById('game').width=640;getElementById('game').height=480;getElementById('game').getContext=()=>({});
 class FakeRuntime{boot(){}loadAssets(){return new Promise((resolve,reject)=>{rejectAssets=reject})}loadProgress(){return null}destroy(){}}
 const ctx=createContext({JaewoonVibeRuntime:FakeRuntime,document:{getElementById,addEventListener(){},removeEventListener(){}},window:{addEventListener(){}},performance:{now:()=>100},requestAnimationFrame(){rafCount++},setTimeout:()=>0,clearTimeout(){},console:{error(){}}});
 new Script(body).runInContext(ctx);
 rejectAssets(new Error('404'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(rafCount,0);
 assert.equal(getElementById('status').textContent,'에셋 로딩 실패');
});


test('core browser smoke scopes real games without misclassifying the Vibe Maker authoring tool',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/vibe2-core-qa.yml',import.meta.url),'utf8');
 assert.match(workflow,/\$1=="web-games" && \$2 ~ \/\^\[a-z0-9-\]\+\$\/ && \$2 != "vibe-maker"/);
 assert.match(workflow,/changed_web_games=ALL/);
 assert.match(workflow,/VIBE2_BROWSER_CHANGED_GAMES:/);
});


// [씬 수명] 전환 성공 시 공용 참조를 유지하고 이전 씬 전용 이미지는 즉시 해제한다.
test('scene transition keeps shared assets, disposes old-only images and ignores stale releases',async()=>{
 const original={fetch:globalThis.fetch,Image:globalThis.Image};
 const images=[];
 globalThis.fetch=async()=>new Response('{"stage":1}',{status:200});
 globalThis.Image=class {
   constructor(){images.push(this)}
   set src(value){this._src=value;if(value)queueMicrotask(()=>this.onload?.())}
   get src(){return this._src}
 };
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/game/'});
   const town=await runtime.setScene('town',[{id:'shared',path:'shared.json'},{id:'map',path:'town.png'}]);
   assert.equal(runtime.activeSceneId,'town');
   assert.equal(runtime.sceneAssets.size,1);
   assert.equal(runtime.assetCache.size,2);
   const townImage=town.assets.map;
   const cave=await runtime.setScene('cave',[{id:'shared',path:'shared.json'},{id:'map',path:'cave.png'}]);
   assert.equal(cave.assets.shared,town.assets.shared);
   assert.equal(runtime.activeSceneId,'cave');
   assert.equal(runtime.sceneAssets.size,1);
   assert.equal(runtime.assetCache.size,2);
   assert.equal(townImage.src,'');
   town.release();
   assert.equal(runtime.assetCache.size,2,'stale scene lease cannot release the new scene');
   cave.release();
   assert.equal(runtime.activeSceneId,null);
   assert.equal(runtime.assetCache.size,0);
   runtime.destroy();
 }finally{globalThis.fetch=original.fetch;globalThis.Image=original.Image}
});

// [씬 원자성] 새 씬 로딩 오류가 현재 플레이 중인 씬을 해제하지 않는다.
test('failed scene transition preserves old scene and its resource leases',async()=>{
 const before=globalThis.fetch;
 globalThis.fetch=async url=>new Response(String(url).includes('bad')?'missing':'{"ok":true}',{status:String(url).includes('bad')?404:200});
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const old=await runtime.setScene('safe',[{id:'shared',path:'ok.json'}]);
   await assert.rejects(runtime.setScene('broken',[{id:'missing',path:'bad.json'}]),AggregateError);
   assert.equal(runtime.activeSceneId,'safe');
   assert.equal(runtime.assetCache.size,1);
   assert.deepEqual(old.assets.shared,{ok:true});
   runtime.destroy();
   assert.equal(runtime.sceneAssets.size,0);
   assert.equal(runtime.assetCache.size,0);
 }finally{globalThis.fetch=before}
});

// [씬 경쟁] 느린 이전 씬 요청은 취소되고, 나중 씬 요청만 활성화된다.
test('new scene transition cancels pending old scene and prevents stale activation',async()=>{
 const before=globalThis.fetch;
 let aborted=0;
 globalThis.fetch=(url,{signal}={})=>String(url).includes('slow')
  ?new Promise((resolve,reject)=>{
    signal?.addEventListener('abort',()=>{aborted++;reject(Object.assign(new Error('aborted'),{name:'AbortError'}))},{once:true});
  })
  :Promise.resolve(new Response('{"new":true}',{status:200}));
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const first=runtime.setScene('old',[{id:'old',path:'slow.json'}]);
   const second=runtime.setScene('new',[{id:'new',path:'new.json'}]);
   await assert.rejects(first,AggregateError);
   const scene=await second;
   assert.equal(scene.assets.new.new,true);
   assert.equal(runtime.activeSceneId,'new');
   assert.equal(runtime.assetCache.size,1);
   assert.equal(aborted,1);
   runtime.destroy();
   assert.equal(runtime.assetCache.size,0);
 }finally{globalThis.fetch=before}
});

// [안정성] 서버 일시 오류만 재시도하고 성공 결과의 참조 해제가 정상 동작한다.
test('asset loader retries transient failures without leaking failed attempts',async()=>{
 const before=globalThis.fetch;
 let attempts=0;
 globalThis.fetch=async()=>new Response(++attempts===1?'try again':'{"ok":true}',{status:attempts===1?503:200});
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const lease=await runtime.loadAssets([{id:'test',path:'retry.json'}],{retries:2});
   assert.equal(attempts,2);
   assert.deepEqual(lease.assets.test,{ok:true});
   assert.equal(runtime.assetCache.size,1);
   lease.release();
   assert.equal(runtime.assetCache.size,0);
   runtime.destroy();
 }finally{globalThis.fetch=before}
});

// [안정성] 타임아웃은 대기를 종료하고 해당 임대만 해제한다.
test('asset timeout rejects without keeping unreferenced entries',async()=>{
 const before=globalThis.fetch;
 globalThis.fetch=()=>new Promise(()=>{});
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   await assert.rejects(runtime.loadAssets([{id:'slow',path:'never.json'}],{retries:0,timeoutMs:5}),AggregateError);
   assert.equal(runtime.assetCache.size,0);
   runtime.destroy();
 }finally{globalThis.fetch=before}
});

// [안정성] 한 요청의 취소가 동일 자산을 참조하는 다른 요청을 중단하지 않는다.
test('shared request survives abort of one consumer and releases on last reference',async()=>{
 const before=globalThis.fetch;
 let complete,calls=0,aborted=0;
 globalThis.fetch=(url,{signal}={})=>{
   calls++;
   signal?.addEventListener('abort',()=>aborted++,{once:true});
   return new Promise(resolve=>{complete=()=>resolve(new Response('{"kept":true}',{status:200}))});
 };
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const controller=new AbortController();
   const first=runtime.loadAssets([{id:'a',path:'common.json'}],{signal:controller.signal});
   const second=runtime.loadAssets([{id:'b',path:'common.json'}]);
   controller.abort();
   await assert.rejects(first,AggregateError);
   complete();
   const other=await second;
   assert.equal(other.assets.b.kept,true);
   assert.equal(calls,1);
   assert.equal(aborted,0,'remaining consumers protect the shared network request');
   other.release();
   assert.equal(runtime.assetCache.size,0);
   runtime.destroy();
 }finally{globalThis.fetch=before}
});

// [안정성] 파괴된 런타임의 미완료 로딩은 완료 후 캐시를 되살릴 수 없다.
test('destroy aborts pending scene loads and prevents late cache resurrection',async()=>{
 const before=globalThis.fetch;
 let abandoned=0;
 globalThis.fetch=(url,{signal}={})=>new Promise((resolve,reject)=>{
   signal?.addEventListener('abort',()=>{abandoned++;reject(Object.assign(new Error('aborted'),{name:'AbortError'}))},{once:true});
 });
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const pending=runtime.setScene('loading',[{id:'a',path:'pending.json'}]);
   runtime.destroy();
   await assert.rejects(pending,AggregateError);
   assert.equal(abandoned,1);
   assert.equal(runtime.assetCache.size,0);
   assert.equal(runtime.sceneAssets.size,0);
 }finally{globalThis.fetch=before}
});


// [씬 오디오] 로딩된 음악의 객체 URL뿐 아니라 등록된 재생 참조도 함께 정리한다.
test('scene transition disposes audio object URL and removes registered playback reference',async()=>{
 const before={fetch:globalThis.fetch,Audio:globalThis.Audio,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 let revoked=0,paused=0;
 globalThis.fetch=async()=>new Response(new Blob(['audio']));
 globalThis.Audio=class {
   constructor(src){this.src=src;this.dataset={}}
   pause(){paused++}
   removeAttribute(name){if(name==='src')this.src=''}
   load(){}
 };
 URL.createObjectURL=()=> 'blob:scene-bgm';
 URL.revokeObjectURL=()=>{revoked++};
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const music=await runtime.setScene('first',[{id:'bgm',path:'theme.ogg'}]);
   runtime.registerAudio('scene-theme',music.assets.bgm,'music');
   assert.equal(runtime.audio.size,1);
   await runtime.setScene('second',[{id:'config',path:'level.txt'}]);
   assert.equal(runtime.audio.size,0);
   assert.equal(revoked,1);
   assert.equal(paused,1);
   runtime.destroy();
 }finally{
   globalThis.fetch=before.fetch;
   globalThis.Audio=before.Audio;
   URL.createObjectURL=before.create;
   URL.revokeObjectURL=before.revoke;
 }
});
