// 파일명: sw.js
// 역할: 재운컴퍼니 PWA 앱 셸만 캐시하고 게임/운영 데이터는 항상 최신 네트워크를 우선한다.

const CACHE_NAME='jaewoon-pwa-v8';
const APP_SHELL=['/command.html','/install.html','/offline.html','/manifest.webmanifest','/assets/pwa-icon-192.png','/assets/pwa-icon-512.png'];
const NETWORK_ONLY=/\/(?:game-catalog|company-status|public-game-health|game-artbooks|public-release-baselines)\.json(?:\?|$)/;

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(NETWORK_ONLY.test(url.pathname+url.search)){event.respondWith(fetch(request,{cache:'no-store'}));return;}
  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>await caches.match('/offline.html')||Response.error()));return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&APP_SHELL.includes(url.pathname)){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}return response;})));
});