'use strict';
const prefix='meridian:'+self.registration.scope+':',cacheName=prefix+'v4';
const files=['./index.html','./style.css','./time.js','./scenery.js','./app.js','./manifest.json','./icons/180.png','./icons/192.png','./icons/512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(cacheName);
 await cache.addAll(files.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(prefix)&&name!==cacheName)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||!req.url.startsWith(self.registration.scope))return;
 const root=new URL(self.registration.scope).pathname,path=new URL(req.url).pathname;
 event.respondWith((async()=>{
  const cache=await caches.open(cacheName);
  if(req.mode==='navigate'&&(path===root||path===root+'index.html'))return await cache.match('./index.html')||fetch(req);
  return await cache.match(req)||fetch(req);
 })());
});
