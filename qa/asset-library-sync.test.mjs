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
 let offline=false,registryRevision=1,registryBodyReads=0;
 const context=vm.createContext({document,Option:function(text,value){return {textContent:text,value};},matchMedia:()=>({matches:false}),AbortSignal,Date,Set,Map,console,
  setInterval:fn=>intervals.push(fn),fetch:async (url,options={})=>{
   const request={url,method:options.method||'GET',headers:options.headers||{}};requests.push(request);if(offline)throw Error('연결 끊김');
   if(url.includes('company-asset-library')){
    const etag='"registry-'+registryRevision+'"';
    if(request.headers['If-None-Match']===etag)return {ok:false,status:304,headers:{get:name=>String(name).toLowerCase()==='etag'?etag:null},json:async()=>{throw Error('304 body must not be read');}};
    return {ok:true,status:200,headers:{get:name=>String(name).toLowerCase()==='etag'?etag:null},json:async()=>{registryBodyReads++;return structuredClone(registry);}};
   }
   return {ok:true,status:200,headers:{get:()=>null},json:async()=>({schemaVersion:1,sampledBy:'OFFICIAL_LUAU',sourceFingerprint:'test',monsters:[],environments:[],commonMotions:[]})};
  }});
 vm.runInContext(fs.readFileSync('assets/asset-library.js','utf8'),context);
 const settle=async()=>{for(let n=0;n<6;n++)await new Promise(resolve=>setImmediate(resolve));};
 await settle();
 const e=id=>elements.get(id);
 assert.equal(e('assetCount').textContent,'5');assert.equal(e('allCount').textContent,5);assert.equal(e('monsterCount').textContent,1);
 assert.equal(e('assetList').children.length,1);assert.equal(e('selectedTitle').textContent,'시험 몬스터');
 assert.equal(e('assetImage').src,'/assets/monster.png');assert.equal(intervals.length,1);
 const registryRequests=()=>requests.filter(row=>row.url.includes('company-asset-library'));
 assert.equal(registryRequests().length,1);assert.equal(registryBodyReads,1);assert.equal(registryRequests()[0].method,'GET');
 e('assetList').scrollTop=73;e('assetList').children[0].focus();
 registryRevision=2;
 registry.assets.push({id:'monster-b',title:'자동 추가 몬스터',category:'CREATURE',path:'https://untrusted.invalid/image.png'});
 registry.assets.push({id:'ui-a',title:'시험 UI',category:'UI',platform:'ROBLOX',status:'REPO_ASSET',path:'/assets/ui.svg',productionVerified:false,runtimeVerificationState:'PENDING_STUDIO',internalAuditScore:882.2,internalAuditGrade:'COMMERCIAL_READY',consumerGameIds:['game-a']});
 await intervals[0]();await settle();
 assert.equal(e('allCount').textContent,7);assert.equal(e('monsterCount').textContent,2);assert.equal(e('assetList').children.length,2);
 assert.equal(e('selectedTitle').textContent,'시험 몬스터');assert.equal(e('assetList').scrollTop,73);assert.equal(document.activeElement.dataset.id,'monster-a');
 assert.equal(registryBodyReads,2);assert.equal(registryRequests().at(-1).method,'GET');assert.equal(registryRequests().at(-1).headers['If-None-Match'],'"registry-1"');
 assert.equal(registryRequests().some(row=>row.method==='HEAD'),false);
 const registryRequestsBefore304=registryRequests().length;await intervals[0]();await settle();
 assert.equal(registryRequests().length,registryRequestsBefore304+1);assert.equal(registryBodyReads,2);assert.equal(registryRequests().at(-1).headers['If-None-Match'],'"registry-2"');
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


test('asset registry signature is cached across 304 refreshes',()=>{
 const script=fs.readFileSync('assets/asset-library.js','utf8');
 assert.match(script,/registryViewSignature=''/);
 assert.match(script,/nextRegistry===registry\?registryViewSignature:registrySignature\(nextRegistry\)/);
 assert.match(script,/registryViewSignature!==nextRegistrySignature/);
 assert.doesNotMatch(script,/registrySignature\(registry\)!==registrySignature\(nextRegistry\)/);
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

test('Roblox shared main menu and bottom navigation use touch scrolling with no replacement system',()=>{
 const script=fs.readFileSync('assets/roblox/common-ui-v1/RobloxCommonUI.luau','utf8');
 const section=(start,end)=>script.slice(script.indexOf('function RobloxCommonUI.'+start+'(options)'),script.indexOf('function RobloxCommonUI.'+end+'(options)'));
 const main=section('CreateMainMenu','CreateTopBar');
 assert.match(main,/ScrollingFrame/);
 assert.match(main,/AutomaticCanvasSize = Enum\.AutomaticSize\.Y/);
 assert.match(main,/body:GetPropertyChangedSignal\("AbsoluteSize"\):Connect\(refreshLayout\)/);
 assert.match(main,/body\.AbsoluteSize\.X < 580/);
 assert.match(main,/hero\.Size = UDim2\.new\(1, 0, 0, bannerHeight\)/);
 assert.match(main,/actions\.Size = UDim2\.new\(1, 0, 1, -bannerHeight - 8\)/);
 assert.match(main,/return root, buttons/);
 const nav=section('CreateOneHandBottomNav','CreateSetProgressTracker');
 assert.match(nav,/root\.AnchorPoint = Vector2\.new\(0\.5, 1\)/);
 assert.match(nav,/root\.Position = options\.position or UDim2\.new\(0\.5, 0, 1, -12\)/);
 assert.match(nav,/scroller\.ScrollingDirection = Enum\.ScrollingDirection\.X/);
 assert.match(nav,/scroller\.AutomaticCanvasSize = Enum\.AutomaticSize\.X/);
 assert.match(nav,/button\.Activated:Connect\(function\(\)/);
 assert.match(nav,/button:SetAttribute\("MinimumTouchHeight", 48\)/);
 assert.match(nav,/if type\(options\.onSelect\)=="function" then options\.onSelect\(i, label\) end/);
 assert.match(nav,/return root, \{inner=scroller, list=scroller, labels=buttons, buttons=buttons\}/);
 assert.match(nav,/OwnsSystemAuthority", false/);
 assert.match(nav,/OwnsRemoteAuthority", false/);
 assert.doesNotMatch(nav,/RunService|RenderStepped|while true/);
});

test('Roblox inventory menu stacks controls on narrow screens and does not clip slots or filters',()=>{
 const script=fs.readFileSync('assets/roblox/common-ui-v1/RobloxCommonUI.luau','utf8');
 const section=(start,end)=>script.slice(script.indexOf('function RobloxCommonUI.'+start+'(options)'),script.indexOf('function RobloxCommonUI.'+end+'(options)'));
 const filter=section('CreateFilterBar','CreateSortControl');
 assert.match(filter,/Instance\.new\("ScrollingFrame"\)/);
 assert.match(filter,/Enum\.ScrollingDirection\.X/);
 assert.match(filter,/Enum\.AutomaticSize\.X/);
 assert.match(filter,/utf8\.len/);
 assert.match(filter,/UDim2\.fromOffset\(width,48\)/);
 const inventory=section('CreateInventoryFullScreen','CreateEquipmentFullScreen');
 assert.match(inventory,/CreateInventoryGrid/);
 assert.match(inventory,/scroll\.ScrollingDirection=Enum\.ScrollingDirection\.Y/);
 assert.match(inventory,/scroll\.AutomaticCanvasSize=Enum\.AutomaticSize\.Y/);
 assert.match(inventory,/body\.AbsoluteSize\.X<560/);
 assert.match(inventory,/search\.Size=UDim2\.new\(1,0,0,48\)/);
 assert.match(inventory,/sort\.Position=UDim2\.fromOffset\(0,56\)/);
 assert.match(inventory,/scroll\.Position=UDim2\.fromOffset\(0,172\)/);
 assert.match(inventory,/cellLayout\.CellSize=UDim2\.fromOffset\(cell,cell\)/);
 assert.match(inventory,/cellLayout:GetPropertyChangedSignal\("AbsoluteContentSize"\)/);
 assert.match(inventory,/root:SetAttribute\("OwnsInventoryAuthority",false\)/);
 assert.doesNotMatch(inventory,/RemoteEvent|DataStoreService|RunService|RenderStepped/);
});

test('Vibe common character equipment inventory and trading screens sync exact owner state and actions',()=>{
 const script=fs.readFileSync('assets/roblox/common-ui-v1/RobloxCommonUI.luau','utf8');
 const section=(a,b)=>script.slice(script.indexOf('function RobloxCommonUI.'+a+'(options)'),script.indexOf('function RobloxCommonUI.'+b+'(options)'));
 const character=section('CreateCharacterDetailScreen','CreateMapFullScreen');
 const equipment=section('CreateEquipmentFullScreen','CreateCharacterDetailScreen');
 const inventory=section('CreateInventoryFullScreen','CreateEquipmentFullScreen');
 const shop=section('CreateShopFullScreen','CreateConfirmDialog');
 for(const [kind,body] of [['character',character],['equipment',equipment],['inventory',inventory],['shop',shop]]){
  assert.match(body,/local function sync\(/,kind);
  assert.match(body,/Sync=sync/,kind);
  assert.doesNotMatch(body,/DataStoreService|SetAsync|UpdateAsync|FireServer|OnServerEvent/);
 }
 assert.match(character,/state\.name/);
 assert.match(character,/state\.className/);
 assert.match(character,/state\.stats/);
 assert.match(character,/state\.revision/);
 assert.match(equipment,/row\.equipped==true/);
 assert.match(equipment,/if row and row\.id and type\(options\.onEquip\)=="function"then options\.onEquip\(row\.id,row\)end/);
 assert.match(inventory,/slot:SetAttribute\("BoundItemId",tostring\(row\.id or ""\)\)/);
 assert.match(inventory,/if current and type\(options\.onSelect\)=="function"then options\.onSelect\(current\.id,current\)end/);
 assert.match(inventory,/for i=#rows\+1,#slots do slots\[i\]\.Visible=false end/);
 assert.match(inventory,/root:SetAttribute\("BoundItemCount",#rows\)/);
 assert.match(shop,/if current\.canSell==true and type\(options\.onSell\)=="function"then options\.onSell\(current\.id,current\)/);
 assert.match(shop,/current\.canBuy==true and type\(options\.onBuy\)=="function"then options\.onBuy\(current\.id,current\)/);
 assert.match(shop,/item\.price~=nil/);
 assert.match(shop,/search:GetPropertyChangedSignal\("Text"\):Connect/);
 assert.match(shop,/list\.AbsoluteSize\.X<430/);
 assert.match(shop,/root:SetAttribute\("OwnsEconomyAuthority",false\)/);
 assert.match(shop,/root:SetAttribute\("OwnsSaveAuthority",false\)/);
 assert.match(shop,/root:SetAttribute\("BoundShopItemCount",#shown\)/);
 const trade=section('CreateBuySellPanel','CreateBuybackPanel');
 assert.match(trade,/name=options.name or "BuySellPanel",size=options.size or UDim2.new\(1,-24,1,-24\)/);
 assert.match(trade,/local function sync\(state\)/);
 assert.match(trade,/item.sellPrice/);
 assert.match(trade,/mode=="SELL"/);
 assert.match(trade,/action\.Activated:Connect\(function\(\)/);
 assert.match(trade,/options.onBuy\(item.id,item\)/);
 assert.match(trade,/options.onSell\(item.id,item\)/);
 assert.match(trade,/root:SetAttribute\("OwnsTradeAuthority",false\)/);
 assert.match(trade,/root:SetAttribute\("OwnsEconomyAuthority",false\)/);
 assert.match(trade,/Sync=sync/);
 assert.doesNotMatch(trade,/DataStoreService|SetAsync|UpdateAsync|FireServer|RemoteEvent/);
});

test('system-menu drawer is a functional touch-safe synchronized menu, not a static suggestion card',()=>{
 const source=fs.readFileSync('assets/roblox/common-ui-v1/RobloxCommonUI.luau','utf8');
 const begin=source.indexOf('function RobloxCommonUI.CreateMenuSystemSwitcherDrawer(options)');
 const end=source.indexOf('function RobloxCommonUI.CreateNavigationBreadcrumbBackstack(options)',begin);
 const body=source.slice(begin,end);
 assert.ok(begin>=0&&end>begin);
 assert.match(body,/Instance.new\("ScrollingFrame"\)/);
 assert.match(body,/scroller\.AutomaticCanvasSize=Enum\.AutomaticSize\.Y/);
 assert.match(body,/button\.Activated:Connect\(function\(\)/);
 assert.match(body,/root:SetAttribute\("BoundSystemCount",#rows\)/);
 assert.match(body,/root:SetAttribute\("CurrentSystemId",selectedId\)/);
 assert.match(body,/button:SetAttribute\("MinimumTouchHeight",48\)/);
 assert.match(body,/options\.onSelect\(id,current\)/);
 assert.match(body,/if type\(current\)=="table"and current\.enabled==false then return end/);
 assert.match(body,/return root,\{inner=inner,list=scroller,labels=buttons,buttons=buttons,Sync=sync\}/);
 for(const role of ['OwnsSystemAuthority','OwnsNavigationAuthority','OwnsSaveAuthority','OwnsRemoteAuthority']){
   assert.match(body,new RegExp('root:SetAttribute\\("'+role+'",false\\)'));
 }
 assert.doesNotMatch(body,/DataStoreService|SetAsync|FireServer|RemoteEvent|RenderStepped|RunService/);
});
