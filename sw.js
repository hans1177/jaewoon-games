// 파일명: sw.js
// 역할: 재운컴퍼니 PWA 앱 셸과 비상 AI를 캐시하고 연결 차단 시에도 개발 대화를 이어간다.

const CACHE_NAME='jaewoon-pwa-v15';
const APP_SHELL=['/command.html','/emergency-ai.js','/install.html','/offline.html','/manifest.webmanifest','/assets/pwa-icon-192.png','/assets/pwa-icon-512.png'];
const NETWORK_ONLY=/\/(?:game-catalog|company-status|public-game-health|game-artbooks|public-release-baselines)\.json(?:\?|$)/;

function injectEmergencyScript(response){
  return response.text().then(html=>{
    if(!html.includes('/emergency-ai.js'))html=html.replace('</body>','<script src="/emergency-ai.js"></script></body>');
    const headers=new Headers(response.headers);headers.delete('Content-Length');headers.set('Cache-Control','no-store, no-cache, must-revalidate');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  });
}

async function serveCommand(request){
  try{
    const fresh=await fetch(request,{cache:'no-store'});
    if(fresh.ok){
      const cache=await caches.open(CACHE_NAME);cache.put('/command.html',fresh.clone()).catch(()=>{});
      return injectEmergencyScript(fresh);
    }
  }catch{}
  const cached=await caches.match('/command.html');
  if(cached)return injectEmergencyScript(cached.clone());
  return await caches.match('/offline.html')||Response.error();
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(url.pathname==='/command.html'&&(request.mode==='navigate'||request.destination==='document')){event.respondWith(serveCommand(request));return;}
  if(NETWORK_ONLY.test(url.pathname+url.search)){event.respondWith(fetch(request,{cache:'no-store'}));return;}
  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>await caches.match('/offline.html')||Response.error()));return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&APP_SHELL.includes(url.pathname)){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}return response;})));
});
