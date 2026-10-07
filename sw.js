const C='meteo-viaggio-v1-3-0';
const A=['./','index.html','styles.css','app.js','notifications.js','manifest.webmanifest','apple-touch-icon.png','apple-touch-icon-precomposed.png','icon-192.png','icon-512.png','favicon-32x32.png','favicon-16x16.png','meteo-viaggio-apple-180-v124.png','meteo-viaggio-192-v124.png','meteo-viaggio-512-v124.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('meteo-viaggio-')&&k!==C).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification.data?.url||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus' in c)return c.focus();}
    return clients.openWindow?clients.openWindow(url):undefined;
  }));
});
