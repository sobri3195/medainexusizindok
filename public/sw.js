const CACHE='izin-dok-v2'
const SHELL=['/','/apps','/manifest.webmanifest']

self.addEventListener('install',event=>{
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)))
})

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
))

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('/')))
    return
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok&&new URL(event.request.url).pathname.startsWith('/assets/')){
      const copy=response.clone()
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))
    }
    return response
  })))
})
