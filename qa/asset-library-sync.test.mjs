import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('asset homepage automatically publishes new entries, preserves selection, excludes retired previews and recovers from outage',async()=>{
 const elements=new Map(),intervals=[],listeners={},requests=[];
 const document={hidden:false,activeElement:null,getElementById:id=>elements.get(id),querySelectorAll:()=>[],addEventListener:(name,fn)=>{listeners[name]=fn;},createElement:tag=>element(tag)};
 function element(tag='div'){
  return {tag,children:[],options:[],dataset:{},attributes:{},listeners:{},textContent:'',value:'',hidden:false,disabled:false,scrollTop:0,scrollLeft:0,
   append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=[...nodes];if(tag==='select')this.options=[...nodes];},add(node){this.options.push(node);},
   setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,fn){this.listeners[name]=fn;},querySelectorAll: function(){return this.children.filter(row=>row.tag==='button');},focus(){document.activeElement=this;}
  };
 }
 const html=fs.readFileSync('asset-library.html','utf8');
 for(const match of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g))elements.set(match[2],element(match[1]));
 const registry={assets:[
  {id:'roblox-insect-spider-hd-v1',title:'삭제 요청 거미',category:'CREATURE'},
  {id:'roblox-insect-spider-hd',title:'삭제 요청 거미',category:'CREATURE'},
  {id:'roblox-world-ghost-gwisin-bride',title:'삭제 요청 처녀귀신',category:'CREATURE'},
  {id:'monster-a',title:'시험 몬스터',category:'CREATURE',internalAuditScore:0,path:'/assets/monster.png'},
  {id:'forest',title:'숲',category:'ENVIRONMENT',path:'/assets/forest.webp'}
 ]};
 let offline=false;
 const context=vm.createContext({document,Option:function(text,value){return {textContent:text,value};},matchMedia:()=>({matches:false}),AbortSignal,Date,Set,Map,console,
  setInterval:fn=>intervals.push(fn),fetch:async url=>{
   requests.push(url);if(offline)throw Error('연결 끊김');
   return {ok:true,headers:{get:()=>null},json:async()=>url.includes('company-asset-library')?structuredClone(registry):{schemaVersion:1,sampledBy:'OFFICIAL_LUAU',sourceFingerprint:'test',monsters:[],environments:[],commonMotions:[]}};
  }});
 vm.runInContext(fs.readFileSync('assets/asset-library.js','utf8'),context);
 const settle=async()=>{for(let n=0;n<6;n++)await new Promise(resolve=>setImmediate(resolve));};
 await settle();
 const e=id=>elements.get(id);
 assert.equal(e('assetCount').textContent,'5');assert.equal(e('allCount').textContent,5);assert.equal(e('monsterCount').textContent,1);
 assert.equal(e('assetList').children.length,1);assert.equal(e('selectedTitle').textContent,'시험 몬스터');
 assert.equal(e('assetImage').src,'/assets/monster.png');assert.equal(intervals.length,1);
 e('assetList').scrollTop=73;e('assetList').children[0].focus();
 registry.assets.push({id:'monster-b',title:'자동 추가 몬스터',category:'CREATURE',path:'https://untrusted.invalid/image.png'});
 registry.assets.push({id:'ui-a',title:'시험 UI',category:'UI',platform:'ROBLOX',status:'REPO_ASSET',path:'/assets/ui.svg',productionVerified:false,runtimeVerificationState:'PENDING_STUDIO',internalAuditScore:882.2,internalAuditGrade:'COMMERCIAL_READY',consumerGameIds:['game-a']});
 await intervals[0]();await settle();
 assert.equal(e('allCount').textContent,7);assert.equal(e('monsterCount').textContent,2);assert.equal(e('assetList').children.length,2);
 assert.equal(e('selectedTitle').textContent,'시험 몬스터');assert.equal(e('assetList').scrollTop,73);assert.equal(document.activeElement.dataset.id,'monster-a');
 await e('assetList').children[1].listeners.click();await settle();
 assert.equal(e('assetImage').hidden,true);assert.equal(e('previewBadge').textContent,'준비 중');
 e('allTab').listeners.click();await settle();
 assert.equal(e('assetList').children.length,7);
 const uiButton=e('assetList').children.find(row=>row.dataset?.id==='ui-a');assert.ok(uiButton);
 await uiButton.listeners.click();await settle();assert.equal(e('selectedTitle').textContent,'시험 UI');assert.match(e('selectedInfo').textContent,/ID ui-a.*카테고리 UI.*플랫폼 ROBLOX.*상태 REPO_ASSET/);
 assert.match(e('selectedInfo').textContent,/내부 품질 882\.2 \/ COMMERCIAL_READY/);assert.match(e('selectedInfo').textContent,/productionVerified: 미검증/);assert.doesNotMatch(e('selectedInfo').textContent,/productionVerified: 검증됨/);assert.match(e('selectedInfo').textContent,/runtimeVerificationState: PENDING_STUDIO/);assert.match(e('selectedInfo').textContent,/사용 게임: game-a/);
 e('assetSearch').value='game-a';e('assetSearch').listeners.input();assert.equal(e('assetList').children.length,1);assert.equal(e('assetList').children[0].dataset.id,'ui-a');e('assetSearch').value='';e('assetSearch').listeners.input();
 e('environmentTab').listeners.click();await settle();assert.equal(e('selectedTitle').textContent,'숲');
 e('assetSearch').value='없는 이름';e('assetSearch').listeners.input();assert.match(e('assetList').children[0].textContent,/찾는 자산이 없어/);
 offline=true;await intervals[0]();await settle();assert.match(e('syncStatus').textContent,/이전 목록/);assert.equal(e('environmentCount').textContent,1);
 const count=requests.length;document.hidden=true;await intervals[0]();assert.equal(requests.length,count);
 offline=false;document.hidden=false;listeners.visibilitychange();await settle();assert.match(e('syncStatus').textContent,/자동 동기화 연결됨/);
});


test('common character assets use the 3D R15 motion viewer instead of image fallback',()=>{
 const page=fs.readFileSync('asset-library.html','utf8');
 const script=fs.readFileSync('assets/asset-library.js','utf8');
 const viewer=fs.readFileSync('assets/asset-library-viewer.js','utf8');
 assert.match(page,/공용 캐릭터/);
 assert.match(script,/else if\(row\.atom\)/);
 assert.match(script,/activeViewer\.setCommonMotion\(row\.atom\)/);
 assert.match(script,/previewBadge'\)\.textContent='모션 재생'/);
 assert.match(viewer,/function setCommonMotion\(atom\)/);
 assert.match(viewer,/host\.dataset\.kind='common'/);
 assert.match(viewer,/function applyCommonMotion\(atom,time\)/);
});


test('featured authored movement and action remain source-bound and reuse the canonical 3D viewer',()=>{
 const page=fs.readFileSync('asset-library.html','utf8');
 const script=fs.readFileSync('assets/asset-library.js','utf8');
 const manifest=JSON.parse(fs.readFileSync('assets/roblox/world-ghosts/native/asset-gallery.json','utf8'));
 const targets=[
  {button:'featuredWalk',asset:'ghoul',clip:'walk'},
  {button:'featuredAttack',asset:'ifrit',clip:'attack'}
 ];
 for(const target of targets){
  assert.match(page,new RegExp('id="'+target.button+'"'));
  const row=manifest.monsters.find(item=>item.id===target.asset);assert.ok(row);
  assert.ok(row.clips.includes(target.clip));
  const source=fs.readFileSync('assets/roblox/world-ghosts/motions/'+target.asset+'/init.luau','utf8');
  assert.match(source,new RegExp('Motion\\.AuthoredClip = "'+target.clip+'"'));
  const sample=JSON.parse(fs.readFileSync(row.path.slice(1),'utf8'));
  assert.equal(sample.sampledBy,'OFFICIAL_LUAU');
  assert.equal(sample.sourceFingerprint,manifest.sourceFingerprint);
  const clip=sample.clips.find(item=>item.id===target.clip);assert.ok(clip);
  assert.equal(clip.frames.length,121);
 }
 assert.match(script,/await choose\(row,true\);applyClip\(clipId\);/);
 assert.match(script,/const environmentPreview=category==='ENVIRONMENT'/);
 assert.match(script,/activeViewer\.setModel\(data,environmentPreview\)/);
});


test('asset homepage all tab exposes every registry family while preserving retired preview restrictions',()=>{
 const page=fs.readFileSync('asset-library.html','utf8');
 const script=fs.readFileSync('assets/asset-library.js','utf8');
 assert.match(page,/id="allTab"[^>]*>전체/);
 assert.match(page,/id="allCount"/);
 assert.match(script,/if\(kind==='all'\)return registry\.assets\.map/);
 for(const category of ['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP']){
  assert.match(script,new RegExp(category+":'"));
 }
 assert.match(script,/retiredPreview=retiredPreviews\.has\(asset\.id\)/);
 assert.match(script,/row\.retiredPreview\?'홈 미리보기 제외'/);
 assert.match(script,/productionVerified: 검증됨/);
 assert.match(script,/productionVerified: 미검증/);
 assert.match(script,/runtimeVerificationState:/);
 assert.match(script,/사용 게임:/);
 assert.match(script,/internalAuditGrade/);
});
