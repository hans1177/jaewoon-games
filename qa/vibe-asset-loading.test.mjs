// 파일명: qa/vibe-asset-loading.test.mjs
// [임포트] 기존 공통 런타임/작업실 실행 경로 직접 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import {JaewoonVibeRuntime} from '../assets/vibe-runtime.js';
import {JaewoonVibeWorkspace} from '../assets/vibe-workspace.js';
import {createVibeWebRuntimeBundle} from '../assets/vibe-web-runtime-runner.js';
import {buildGeneratedGame,normalizeGeneratedGameAssets} from '../assets/game-generator.js';
import {JaewoonGameSession} from '../assets/game-session.js';
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
 assert.ok(basic.html.includes("import { JaewoonVibeRuntime, createVibeModelSprites } from '../../assets/vibe-runtime.js'"));
 const configured=buildGeneratedGame({packageData:{gameId:'approved',assets:{player:'assets/player.png',bgm:'audio/music.ogg'}}});
 assert.ok(configured.html.includes('"path":"assets/player.png"'));
 assert.ok(configured.html.includes('"path":"audio/music.ogg"'));
 assert.ok(configured.html.includes("runtime.setScene('play',ASSET_MANIFEST"));
 assert.ok(configured.html.includes('loadedAssets.player'));
 assert.ok(configured.html.includes("runtime.registerAudio('generated-bgm'"));
 assert.ok(!configured.html.includes('javascript:alert(1)'));
});

test('generated game gates startup on asset loading and draws provided assets',async()=>{
 const html=buildGeneratedGame({packageData:{gameId:'qa-generated-assets',assets:{background:'assets/bg.png',player:'assets/player.png',enemy:'assets/enemy.png',bgm:'audio/bgm.ogg'}}}).html;
 const scriptSource=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(scriptSource,'generated module script exists');
 const body=scriptSource.replace(/^import \{[^\n]+\} from '[^']+';$/gm,'');
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
   setScene(sceneId,entries,{onProgress}){assert.equal(sceneId,'play');loadedEntries=entries;onProgress({progress:0});return new Promise(resolve=>{resolveAssets=()=>{onProgress({progress:1});resolve({assets:{background:{kind:'bg'},player:{kind:'player'},enemy:{kind:'enemy'},bgm:{loop:false}},release(){}})}})}
   registerAudio(name,audio,kind){assert.equal(name,'generated-bgm');assert.equal(kind,'music');this.audio=audio}
   playAudio(name){assert.equal(name,'generated-bgm');plays++}
   destroy(){}
 }
 const context=createContext({JaewoonVibeRuntime:FakeRuntime,createVibeCanvasVfx:()=>({burst(){},draw(){},update(){},dispose(){}}),VibePresentationEngine:class {constructor(){this.settings={reducedMotion:false}}update(){}tween(){}dispose(){}},document:doc,window:{addEventListener(){}},performance:{now:()=>100},requestAnimationFrame(fn){rafCount++;frame=fn},setTimeout:()=>0,clearTimeout(){},console});
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
 const body=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import \{[^\n]+\} from '[^']+';$/gm,'');
 let rejectAssets,rafCount=0;
 const ui=new Map();
 const getElementById=id=>{if(!ui.has(id))ui.set(id,{textContent:'',style:{},addEventListener(){},setPointerCapture(){},getBoundingClientRect:()=>({width:140,left:0,top:0})});return ui.get(id)};
 getElementById('game').width=640;getElementById('game').height=480;getElementById('game').getContext=()=>({});
 class FakeRuntime{boot(){}setScene(){return new Promise((resolve,reject)=>{rejectAssets=reject})}loadProgress(){return null}destroy(){}}
 const ctx=createContext({JaewoonVibeRuntime:FakeRuntime,createVibeCanvasVfx:()=>({burst(){},draw(){},update(){},dispose(){}}),VibePresentationEngine:class {constructor(){this.settings={reducedMotion:false}}update(){}tween(){}dispose(){}},document:{getElementById,addEventListener(){},removeEventListener(){}},window:{addEventListener(){}},performance:{now:()=>100},requestAnimationFrame(){rafCount++},setTimeout:()=>0,clearTimeout(){},console:{error(){}}});
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


// [씬 취소] 첫 씬 로딩 전에도 명시적으로 해제할 수 있다.
test('releaseScene cancels pending first scene without creating an active scene',async()=>{
 const fetchBefore=globalThis.fetch;
 let aborted=0;
 globalThis.fetch=(url,{signal}={})=>new Promise((resolve,reject)=>{
   signal.addEventListener('abort',()=>{aborted++;reject(Object.assign(new Error('cancelled'),{name:'AbortError'}))},{once:true});
 });
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const pending=runtime.setScene('intro',[{id:'intro',path:'intro.json'}]);
   assert.equal(runtime.getAssetStats().pendingSceneId,'intro');
   assert.equal(runtime.releaseScene(),true);
   await assert.rejects(pending,AggregateError);
   assert.equal(aborted,1);
   assert.equal(runtime.getAssetStats().total,0);
   assert.equal(runtime.getAssetStats().pendingSceneId,null);
   assert.equal(runtime.activeSceneId,null);
   runtime.destroy();
 } finally {globalThis.fetch=fetchBefore}
});

// [씬 취소] 다른 씬 ID를 취소 요청해도 현재 로딩에는 영향이 없다.
test('cancelSceneLoading only cancels the matching pending scene',async()=>{
 const before=globalThis.fetch;
 let finish;
 globalThis.fetch=()=>new Promise(resolve=>{finish=()=>resolve(new Response('{"ok":true}'))});
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const pending=runtime.setScene('scene-one',[{id:'a',path:'a.json'}]);
   assert.equal(runtime.cancelSceneLoading('not-this-scene'),false);
   finish();
   const ready=await pending;
   assert.equal(ready.assets.a.ok,true);
   assert.equal(runtime.getAssetStats().pendingSceneId,null);
   assert.equal(runtime.activeSceneId,'scene-one');
   runtime.destroy();
 } finally {globalThis.fetch=before}
});

// [씬 전환 취소] 기존 씬을 해제하면 다음 씬의 진행 중인 요청도 중단한다.
test('release of active scene cancels pending replacement and clears all leases',async()=>{
 const before=globalThis.fetch;
 let cancelled=0;
 globalThis.fetch=(url,{signal}={})=>String(url).includes('slow')?new Promise((resolve,reject)=>{
   signal.addEventListener('abort',()=>{cancelled++;reject(Object.assign(new Error('abort'),{name:'AbortError'}))},{once:true});
 }):Promise.resolve(new Response('{"ok":true}'));
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   await runtime.setScene('one',[{id:'main',path:'fast.json'}]);
   const replacement=runtime.setScene('two',[{id:'next',path:'slow.json'}]);
   assert.equal(runtime.releaseScene('one'),true);
   await assert.rejects(replacement,AggregateError);
   assert.equal(cancelled,1);
   assert.equal(runtime.getAssetStats().total,0);
   assert.equal(runtime.activeSceneId,null);
   runtime.destroy();
 } finally {globalThis.fetch=before}
});

// [캐시 통계] 중복 로딩과 씬 해제에 따라 실제 참조 횟수가 바뀐다.
test('getAssetStats reports real loaded references and immutable type counts',async()=>{
 const before=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('{"data":true}')};
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const a=await runtime.setScene('alpha',[{id:'shared',path:'shared.json'}]);
   const b=await runtime.loadAssets([{id:'same',path:'shared.json'}]);
   const snap=runtime.getAssetStats();
   assert.equal(calls,1);
   assert.equal(snap.total,1);
   assert.equal(snap.ready,1);
   assert.equal(snap.loading,0);
   assert.equal(snap.references,2);
   assert.equal(snap.sceneCount,1);
   assert.equal(snap.activeSceneId,'alpha');
   assert.equal(snap.byType.json,1);
   assert.ok(Object.isFrozen(snap) && Object.isFrozen(snap.byType));
   a.release();
   assert.equal(runtime.getAssetStats().references,1);
   b.release();
   assert.equal(runtime.getAssetStats().total,0);
   runtime.destroy();
 } finally {globalThis.fetch=before}
});

// [일시 실패 복구] HTTP 429는 제한된 재시도로 회복할 수 있다.
test('rate limit errors retry with bounded delay then succeed',async()=>{
 const before=globalThis.fetch;
 let count=0;
 globalThis.fetch=async()=>{
   count++;
   return count<3?new Response('rate limited',{status:429}):new Response('{"ok":true}');
 };
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const result=await runtime.loadAssets([{id:'config',path:'config.json'}],{retries:2,retryDelayMs:1});
   assert.equal(count,3);
   assert.equal(result.assets.config.ok,true);
   result.release();
   assert.equal(runtime.getAssetStats().total,0);
   runtime.destroy();
 } finally {globalThis.fetch=before}
});

// [영구 오류 차단] 손상된 JSON과 HTTP 404는 재시도하지 않는다.
test('permanent 404 and invalid JSON stop without pointless repeated downloads',async()=>{
 const before=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async url=>{
   calls++;
   return String(url).includes('missing')?new Response('missing',{status:404}):new Response('invalid json');
 };
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   await assert.rejects(runtime.loadAssets([{id:'missing',path:'missing.json'}],{retries:5,retryDelayMs:1}),AggregateError);
   assert.equal(calls,1);
   await assert.rejects(runtime.loadAssets([{id:'broken',path:'broken.json'}],{retries:5,retryDelayMs:1}),AggregateError);
   assert.equal(calls,2);
   assert.equal(runtime.getAssetStats().total,0);
   runtime.destroy();
 } finally {globalThis.fetch=before}
});

// [콜백 격리] 게임 UI의 진행률/완료 콜백 오류가 캐시 임대를 누수시키지 않는다.
test('progress and completion callback exceptions do not leak assets or block success',async()=>{
 const before=globalThis.fetch;
 globalThis.fetch=async()=>new Response('{"ok":true}');
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   let completed=0;
   const success=await runtime.loadAssets([{id:'a',path:'a.json'}],{
     onProgress(){throw new Error('UI disposed')},
     onComplete(){completed++;throw new Error('UI disposed')}
   });
   assert.equal(completed,1);
   assert.equal(success.assets.a.ok,true);
   success.release();
   assert.equal(runtime.getAssetStats().total,0);
   runtime.destroy();
 } finally {globalThis.fetch=before}
});

// [대기 정리] 재시도 대기 중 취소되면 추가 네트워크 요청을 만들지 않는다.
test('abort during retry delay stops subsequent attempts and clears cache',async()=>{
 const before=globalThis.fetch;
 const controller=new AbortController();
 let count=0;
 globalThis.fetch=async()=>{
   count++;
   queueMicrotask(()=>controller.abort());
   return new Response('temporary',{status:503});
 };
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   await assert.rejects(runtime.loadAssets([{id:'bad',path:'bad.json'}],{
     signal:controller.signal,retries:5,retryDelayMs:100
   }),AggregateError);
   assert.equal(count,1);
   assert.equal(runtime.getAssetStats().total,0);
   runtime.destroy();
 } finally {globalThis.fetch=before}
});

// [폰트 수명] 취소된 폰트 로딩은 FontFaceSet에 늦게 등록되지 않는다.
test('aborted font load never registers a late FontFace or keeps a cached lease',async()=>{
 const old={fetch:globalThis.fetch,FontFace:globalThis.FontFace,document:globalThis.document};
 let finish,registered=0;
 globalThis.fetch=async()=>new Response(new Uint8Array([0,1,2]));
 globalThis.document={baseURI:'https://example.com/',fonts:{add(){registered++},delete(){registered--;return true}}};
 globalThis.FontFace=class {constructor(){}load(){return new Promise(resolve=>{finish=()=>resolve(this)})}};
 try {
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const loading=runtime.setScene('fonts',[{id:'ui',path:'font.woff2',family:'UI'}]);
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(typeof finish,'function');
   assert.equal(runtime.releaseScene(),true);
   await assert.rejects(loading,AggregateError);
   finish();
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(registered,0);
   assert.equal(runtime.getAssetStats().total,0);
   runtime.destroy();
 } finally {
   globalThis.fetch=old.fetch;
   globalThis.FontFace=old.FontFace;
   globalThis.document=old.document;
 }
});


// [에셋 큐] 높은 우선순위가 먼저 시작되고 선행 에셋 완료 전 종속 로딩은 시작하지 않는다.
test('priority and dependency groups execute in order and reject dependency cycles',async()=>{
 const previous=globalThis.fetch,order=[];
 globalThis.fetch=async url=>{order.push(String(url).split('/').pop());return new Response('{"ok":true}')};
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const lease=await runtime.loadAssets([
     {id:'low',path:'low.json',priority:0},
     {id:'high',path:'high.json',priority:10},
     {id:'child',path:'child.json',priority:100,dependsOn:['high']}
   ],{concurrency:1});
   assert.deepEqual(order,['high.json','low.json','child.json']);
   assert.equal(lease.assets.child.ok,true);
   lease.release();
   await assert.rejects(runtime.loadAssets([{id:'a',path:'a.json',dependsOn:['b']},{id:'b',path:'b.json',dependsOn:['a']}]),/circular asset dependencies/);
   assert.equal(runtime.getAssetStats().total,0);
   runtime.destroy();
 }finally{globalThis.fetch=previous}
});

// [메모리] 활성 씬을 보존하면서 선행 로딩을 제한하고, 다음 씬 재사용에 중복 다운로드가 없다.
test('preloadScene reuses ready assets and memory trim evicts only speculative scenes',async()=>{
 const previous=globalThis.fetch;const requests=[];
 globalThis.fetch=async url=>{requests.push(String(url));return new Response(new Uint8Array(32))};
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/',assetMemoryLimitBytes:100});
   const active=await runtime.setScene('play',[{id:'main',path:'main.bin'}]);
   assert.equal(runtime.getAssetStats().estimatedBytes,32);
   const first=await runtime.preloadScene('next',[{id:'next',path:'next.bin'}]);
   assert.equal(first.ready,true);
   assert.equal(runtime.getAssetStats().preloadedSceneCount,1);
   const transferred=await runtime.setScene('next',[{id:'next',path:'next.bin'}]);
   assert.equal(transferred.assets.next.byteLength,32);
   assert.equal(requests.filter(url=>url.endsWith('/next.bin')).length,1);
   assert.equal(runtime.getAssetStats().preloadedSceneCount,0);
   const old=await runtime.preloadScene('future',[{id:'future',path:'future.bin'}]);
   assert.equal(old.ready,true);
   runtime.setAssetMemoryLimit(40);
   assert.equal(runtime.getAssetStats().preloadedSceneCount,0);
   assert.equal(runtime.activeSceneId,'next');
   assert.equal(runtime.getAssetStats().estimatedBytes,32);
   active.release();
   runtime.destroy();
 }finally{globalThis.fetch=previous}
});

// [변경 감지] HEAD 지문이 바뀌어도 활성 씬을 중단하지 않고 신규 요청만 갱신한다.
test('asset change detection invalidates future requests without mutating active scene',async()=>{
 const previous=globalThis.fetch;let etag='v1';const urls=[];
 globalThis.fetch=async (url,options={})=>{
   if(options.method==='HEAD')return new Response(null,{status:200,headers:{etag}});
   urls.push(String(url));return new Response('{"value":1}');
 };
 try{
   const runtime=new JaewoonVibeRuntime({assetBaseUrl:'https://example.com/'});
   const old=await runtime.setScene('old',[{id:'a',path:'config.json'}]);
   assert.equal((await runtime.checkAssetUpdates(['config.json'])).changed.length,0);
   etag='v2';
   assert.deepEqual((await runtime.checkAssetUpdates(['config.json'])).changed,['config.json']);
   assert.equal(old.assets.a.value,1);
   const fresh=await runtime.setScene('new',[{id:'a',path:'config.json'}]);
   assert.equal(urls.length,2);
   assert.match(urls[1],/_vibe_asset_revision=1/);
   assert.equal(runtime.getAssetDiagnostics().entries.length,1);
   fresh.release();runtime.destroy();
 }finally{globalThis.fetch=previous}
});


// [시각화/감시] 기존 패널이 실측 진단 이벤트를 받아 모바일에서도 상태를 표시한다.
test('asset diagnostics panel observes the existing runtime without modifying gameplay',()=>{
 const panel=readFileSync(new URL('../assets/vibe-runtime-panel.js',import.meta.url),'utf8');
 assert.match(panel,/jaewoon:assets-stats/);
 assert.match(panel,/info\.estimatedBytes/);
 assert.match(panel,/info\.preloadedSceneCount/);
 assert.match(panel,/panel\.append\(title,close,status,diagnostics/);
});


// [실제 세션 연결] 등록한 씬의 에셋을 전환 직전에 획득하고 실패 시 게임 진행 상태를 유지한다.
test('game session loads declared scene assets, preserves failed transition and releases on back',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>new Response(String(url).includes('missing')?'not found':'{"ok":true}',{status:String(url).includes('missing')?404:200});
 try{
   const session=new JaewoonGameSession({gameId:'scene-asset-session-qa',genre:'survival',autoRestore:false,runtimeOptions:{assetBaseUrl:'https://example.com/'}});
   session.registerScene('town',{assets:[{id:'shared',path:'shared.json'}]});
   session.registerScene('cave',{assets:[{id:'shared',path:'shared.json'},{id:'map',path:'map.json'}]});
   session.registerScene('broken',{assets:[{id:'missing',path:'missing.json'}]});
   assert.equal(await session.goToScene('town'),'town');
   assert.equal(session.runtime.activeSceneId,'town');
   assert.equal(await session.goToScene('cave'),'cave');
   assert.equal(session.runtime.getAssetStats().total,2);
   await assert.rejects(session.goToScene('broken'),AggregateError);
   assert.equal(session.scenes.current,'cave');
   assert.equal(session.runtime.activeSceneId,'cave');
   assert.equal(await session.backScene(),'town');
   assert.equal(session.runtime.getAssetStats().total,1);
   session.registerScene('empty');
   assert.equal(session.goToScene('empty'),'empty');
   assert.equal(session.runtime.getAssetStats().total,0);
   session.destroy();
 }finally{globalThis.fetch=original}
});

// [VFX 생성기] 새 웹게임도 기존 저장/씬 로딩과 동일한 렌더 루프에서 공용 효과를 사용한다.
test('generated web games reuse shared Vibe VFX and tween without changing save contract',()=>{
 const html=buildGeneratedGame({packageData:{gameId:'vfx-generated',content:{}},title:'VFX Generated'}).html;
 assert.match(html,/createVibeCanvasVfx/);
 assert.match(html,/VibePresentationEngine/);
 assert.match(html,/vfx\.burst\('impact'/);
 assert.match(html,/vfx\.burst\('explosion'/);
 assert.match(html,/vfx\.draw\(ctx\)/);
 assert.match(html,/presentation\.tween\('toast'/);
 assert.match(html,/runtime\.setScene\('play'/);
 assert.match(html,/runtime\.flushSaveProgress/);
});


// [공통 세션 취소] 에셋 없는 화면·뒤로가기·체크포인트에서 미완료 로딩을 중지한다.
test('asset-free scene changes cancel pending scene loading without changing saves',async()=>{
 const before=globalThis.fetch;
 let aborted=0;
 globalThis.fetch=(url,{signal}={})=>new Promise((resolve,reject)=>{
  const fail=()=>{aborted++;reject(Object.assign(new Error('cancelled'),{name:'AbortError'}))};
  if(signal.aborted)fail();
  else signal.addEventListener('abort',fail,{once:true});
 });
 try{
  const session=new JaewoonGameSession({gameId:'asset-free-scene-qa',genre:'survival',autoRestore:false,runtimeOptions:{assetBaseUrl:'https://example.com/'}});
  session.registerScene('menu');
  session.registerScene('loading',{assets:[{id:'map',path:'slow.json'}]});
  assert.equal(session.goToScene('menu'),'menu');
  session.checkpointScene('menu');
  const first=session.goToScene('loading');
  assert.equal(session.runtime.getAssetStats().pendingSceneId,'loading');
  assert.equal(session.goToScene('menu'),'menu');
  await assert.rejects(first,AggregateError);
  assert.equal(session.scenes.current,'menu');
  assert.equal(session.runtime.getAssetStats().total,0);
  const second=session.goToScene('loading');
  assert.equal(session.backScene('menu'),'menu');
  await assert.rejects(second,AggregateError);
  const third=session.goToScene('loading');
  assert.ok(session.restoreSceneCheckpoint('menu'));
  await assert.rejects(third,AggregateError);
  assert.equal(aborted,3);
  assert.equal(session.runtime.getAssetStats().pendingSceneId,null);
  assert.equal(session.runtime.getAssetStats().sceneCount,0);
  assert.equal(session.scenes.current,'menu');
  session.destroy();
 }finally{globalThis.fetch=before}
});

// [공통 씬 진입] 로딩 완료된 실제 객체가 기존 진입 콜백으로 전달된다.
test('scene enter and checkpoint restore receive loaded scene assets',async()=>{
 const before=globalThis.fetch;
 globalThis.fetch=async()=>new Response('{"ready":true}',{status:200});
 try{
  const visits=[];
  const session=new JaewoonGameSession({gameId:'scene-enter-assets-qa',genre:'survival',autoRestore:false,runtimeOptions:{assetBaseUrl:'https://example.com/'}});
  session.registerScene('menu');
  session.registerScene('world',{assets:[{id:'map',path:'world.json'}],enter:ctx=>visits.push(ctx.assets?.map?.ready)});
  await session.goToScene('world');
  assert.deepEqual(visits,[true]);
  session.checkpointScene('world');
  session.goToScene('menu');
  await session.goToScene('world');
  assert.deepEqual(visits,[true,true]);
  await session.restoreSceneCheckpoint('world');
  assert.deepEqual(visits,[true,true,true]);
  session.goToScene('menu');
  assert.equal(session.runtime.getAssetStats().total,0);
  session.destroy();
 }finally{globalThis.fetch=before}
});

// [기존 실제 게임] 자체 원화 경로가 공통 씬 취소·해제 수명과 연결되어야 한다.
test('ocean voyage, cozy island and gem survivor reuse the shared scene asset lifecycle',()=>{
 const ocean=readFileSync(new URL('../web-games/ocean-voyage/ocean3d.mjs',import.meta.url),'utf8');
 const cozy=readFileSync(new URL('../web-games/cozy-island/render-v3.js',import.meta.url),'utf8');
 const cozyGame=readFileSync(new URL('../web-games/cozy-island/game-v3.js',import.meta.url),'utf8');
 const gem=readFileSync(new URL('../web-games/gem-survivor/gem3d.mjs',import.meta.url),'utf8');
 assert.match(ocean,/assetRuntime\.setScene\(nextScene,\[\{id:'harbor',path:'\.\/assets\/harbor\.webp'\}\]/);
 assert.match(ocean,/if\(!nextScene\)\{assetRuntime\.releaseScene\(\);return;\}/);
 assert.match(ocean,/dispose\(\)\{destroyed=true;assetRuntime\.destroy\(\)/);
 assert.doesNotMatch(ocean,/townArt=new Image\(\)/);
 assert.match(cozy,/this\.assetRuntime\.setScene\('cozy-island-world'/);
 assert.match(cozy,/new THREE\.Texture\(sharedTree\)/);
 assert.match(cozyGame,/new IslandRendererV3\(canvas,runtime\)/);
 assert.match(cozyGame,/pagehide',event=>\{if\(!event\.persisted\)runtime\.destroy\(\)/);
 assert.match(gem,/assetRuntime\.setScene\('gem-survivor-world'/);
 assert.match(gem,/monsterTextures\.set\(id,texture\)/);
 assert.match(gem,/assetRuntime\.destroy\(\)/);
 assert.doesNotMatch(gem,/textureLoader\.loadAsync\(new URL\('monster-'/);
});
