// 파일명: sw.js
// 역할: 재운컴퍼니 PWA 앱 셸과 비상 AI를 캐시하고 연결 차단 시에도 개발 대화를 이어간다.

const CACHE_NAME='jaewoon-pwa-v26';
// 마력숲 3D 데이터만 격리 저장한다. 세이브·API·HTML·게임 규칙은 캐시하지 않는다.
const FOREST_CACHE='jaewoon-forest-3d-v1';
const FOREST_MAX_ENTRIES=48;
const FOREST_MAX_FILE_BYTES=24*1024*1024;
const forestValidated=new Set();
function isForestAsset(path){
  return /\/web-games\/fantasy-survival\/(?:models\.json\.gz|(?:knight|mage|rogue|rogue-hooded|barbarian)\.glb\.gz)$/.test(path)
    || /\/assets\/shared\/forest\/[^?#]+\.(?:fbx|glb|obj|mtl|png|webp|jpg|jpeg)$/.test(path)
    || /\/assets\/roblox\/actors\/native\/[^?#]+\.glb$/.test(path);
}
async function cacheForestAsset(cache,request,response){
  if(!response.ok||response.type!=='basic')return;
  const size=Number(response.headers.get('content-length')||0);
  if(size>FOREST_MAX_FILE_BYTES)return;
  try{
    await cache.put(request,response.clone());
    const keys=await cache.keys();
    for(const old of keys.slice(0,Math.max(0,keys.length-FOREST_MAX_ENTRIES)))await cache.delete(old);
  }catch{ /* 사설 모드/용량 초과에서는 네트워크 로딩 유지 */ }
}
async function serveForestAsset(request,event){
  let cache;
  try{cache=await caches.open(FOREST_CACHE)}catch{return fetch(request)}
  const cached=await cache.match(request);
  if(cached){
    if(!forestValidated.has(request.url)){
      forestValidated.add(request.url);
      event.waitUntil(fetch(request,{cache:'no-cache'}).then(response=>
        cacheForestAsset(cache,request,response)).catch(()=>{}));
    }
    return cached;
  }
  const response=await fetch(request);
  if(response.ok)event.waitUntil(cacheForestAsset(cache,request,response));
  return response;
}
const APP_SHELL=['/command.html','/emergency-ai.js','/install.html','/offline.html','/manifest.webmanifest','/assets/pwa-icon.svg','/assets/pwa-icon-192.png','/assets/pwa-icon-512.png'];
const NETWORK_ONLY=/\/web-games\/_shared\/touch-controls\.js(?:\?|$)|\/assets\/homepage-enhancements\.js(?:\?|$)|\/(?:game-catalog|company-status|homepage-platform-exposure|homepage-portfolio-status|test-game-candidates|public-game-health|game-artbooks|public-release-baselines)\.json(?:\?|$)/;

function injectEmergencyScript(response){
  return response.text().then(html=>{
    if(!html.includes('/emergency-ai.js'))html=html.replace('</body>','<script src="/emergency-ai.js"></script></body>');
    const headers=new Headers(response.headers);headers.delete('Content-Length');headers.set('Cache-Control','no-store, no-cache, must-revalidate');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  });
}

async function serveCommand(request){
  const cached=await caches.match('/command.html');
  const update=fetch(request,{cache:'no-store'}).then(async fresh=>{
    if(fresh.ok){
      const cache=await caches.open(CACHE_NAME);
      await cache.put('/command.html',fresh.clone());
    }
    return fresh;
  }).catch(()=>null);
  if(cached){
    update.catch(()=>{});
    return injectEmergencyScript(cached.clone());
  }
  const fresh=await update;
  if(fresh?.ok)return injectEmergencyScript(fresh);
  return await caches.match('/offline.html')||Response.error();
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>((key.startsWith('jaewoon-pwa-')&&key!==CACHE_NAME)||(key.startsWith('jaewoon-forest-3d-')&&key!==FOREST_CACHE))).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(isForestAsset(url.pathname)){event.respondWith(serveForestAsset(request,event));return;}
  if(url.pathname==='/command.html'&&(request.mode==='navigate'||request.destination==='document')){event.respondWith(serveCommand(request));return;}
  if(NETWORK_ONLY.test(url.pathname+url.search)){
    // 런타임 JSON은 서버가 선언한 짧은 HTTP 캐시만 사용한다. 오프라인 앱 저장소로 대체하지 않는다.
    const runtimeMetadata=/^\/(game-catalog|company-status|homepage-platform-exposure|homepage-portfolio-status)\.json$/.test(url.pathname);
    event.respondWith(fetch(request,{cache:runtimeMetadata?'default':'no-store'}));return;
  }
  if(url.pathname.startsWith('/web-games/daechung-rpg/')){event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>await caches.match(request)||Response.error()));return;}
  if(request.mode==='navigate'){
    const isWebGame=url.pathname.startsWith('/web-games/');
    event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>{
      if(isWebGame)return Response.error();
      return await caches.match(request)||await caches.match('/offline.html')||Response.error();
    }));return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&APP_SHELL.includes(url.pathname)){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}return response;})));
});
